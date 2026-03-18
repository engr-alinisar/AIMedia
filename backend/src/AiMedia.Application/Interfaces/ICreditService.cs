namespace AiMedia.Application.Interfaces;

public interface ICreditService
{
    Task ReserveAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default);
    Task DeductAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default);
    Task ReleaseAsync(Guid userId, Guid jobId, int credits, string description, CancellationToken cancellationToken = default);
    Task<(int Balance, int Reserved)> GetBalanceAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> HasSufficientCreditsAsync(Guid userId, int required, CancellationToken cancellationToken = default);
}
