using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Credits;

public class CreditService(IAppDbContext db, ILogger<CreditService> logger) : ICreditService
{
    public async Task ReserveAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default)
    {
        // Atomic: deduct from available balance, add to reserved
        var rows = await ((DbContext)(object)db).Database.ExecuteSqlRawAsync(
            """
            UPDATE users
            SET credit_balance = credit_balance - {0},
                reserved_credits = reserved_credits + {0}
            WHERE id = {1} AND credit_balance >= {0}
            """,
            credits, userId);

        if (rows == 0)
            throw new InvalidOperationException("Insufficient credits or user not found.");

        var user = await ((DbContext)(object)db).Set<User>().AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreditBalance, u.ReservedCredits })
            .FirstOrDefaultAsync(cancellationToken);

        var tx = new CreditTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.Reservation,
            Amount = -credits,
            BalanceAfter = user?.CreditBalance ?? 0,
            Description = description,
            JobId = jobId,
            CreatedAt = DateTime.UtcNow
        };

        ((DbContext)(object)db).Set<CreditTransaction>().Add(tx);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Reserved {Credits} credits for user {UserId} job {JobId}", credits, userId, jobId);
    }

    public async Task DeductAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default)
    {
        // Release from reserved (balance already deducted at reserve time)
        var rows = await ((DbContext)(object)db).Database.ExecuteSqlRawAsync(
            """
            UPDATE users
            SET reserved_credits = reserved_credits - {0}
            WHERE id = {1} AND reserved_credits >= {0}
            """,
            credits, userId);

        if (rows == 0)
            logger.LogWarning("Could not deduct reserved credits for user {UserId} job {JobId}", userId, jobId);

        var user = await ((DbContext)(object)db).Set<User>().AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreditBalance })
            .FirstOrDefaultAsync(cancellationToken);

        var tx = new CreditTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.Deduction,
            Amount = -credits,
            BalanceAfter = user?.CreditBalance ?? 0,
            Description = description,
            JobId = jobId,
            CreatedAt = DateTime.UtcNow
        };

        ((DbContext)(object)db).Set<CreditTransaction>().Add(tx);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Deducted {Credits} credits for user {UserId} job {JobId}", credits, userId, jobId);
    }

    public async Task ReleaseAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default)
    {
        // Refund: restore balance, remove from reserved
        await ((DbContext)(object)db).Database.ExecuteSqlRawAsync(
            """
            UPDATE users
            SET credit_balance = credit_balance + {0},
                reserved_credits = GREATEST(reserved_credits - {0}, 0)
            WHERE id = {1}
            """,
            credits, userId);

        var user = await ((DbContext)(object)db).Set<User>().AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreditBalance })
            .FirstOrDefaultAsync(cancellationToken);

        var tx = new CreditTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.Refund,
            Amount = credits,
            BalanceAfter = user?.CreditBalance ?? 0,
            Description = description,
            JobId = jobId,
            CreatedAt = DateTime.UtcNow
        };

        ((DbContext)(object)db).Set<CreditTransaction>().Add(tx);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Released {Credits} credits for user {UserId} job {JobId}", credits, userId, jobId);
    }

    public async Task<(int Balance, int Reserved)> GetBalanceAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await ((DbContext)(object)db).Set<User>().AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreditBalance, u.ReservedCredits })
            .FirstOrDefaultAsync(cancellationToken);

        return user == null ? (0, 0) : (user.CreditBalance, user.ReservedCredits);
    }

    public async Task<bool> HasSufficientCreditsAsync(Guid userId, int required, CancellationToken cancellationToken = default)
    {
        var (balance, _) = await GetBalanceAsync(userId, cancellationToken);
        return balance >= required;
    }

    public async Task AddCreditsAsync(Guid userId, int credits, string description, CancellationToken cancellationToken = default)
    {
        await ((DbContext)(object)db).Database.ExecuteSqlRawAsync(
            """
            UPDATE users
            SET credit_balance = credit_balance + {0}
            WHERE id = {1}
            """,
            credits, userId);

        var user = await ((DbContext)(object)db).Set<User>().AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.CreditBalance })
            .FirstOrDefaultAsync(cancellationToken);

        var tx = new CreditTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = TransactionType.Purchase,
            Amount = credits,
            BalanceAfter = user?.CreditBalance ?? 0,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };

        ((DbContext)(object)db).Set<CreditTransaction>().Add(tx);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Added {Credits} credits to user {UserId}", credits, userId);
    }
}
