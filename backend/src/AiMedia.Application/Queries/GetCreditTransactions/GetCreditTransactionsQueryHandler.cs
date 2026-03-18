using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.GetCreditTransactions;

public class GetCreditTransactionsQueryHandler(IAppDbContext db) : IRequestHandler<GetCreditTransactionsQuery, PagedResult<CreditTransactionDto>>
{
    public async Task<PagedResult<CreditTransactionDto>> Handle(GetCreditTransactionsQuery request, CancellationToken cancellationToken)
    {
        var query = db.CreditTransactions
            .Where(t => t.UserId == request.UserId)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<CreditTransactionDto>
        {
            Items = items.Select(t => new CreditTransactionDto
            {
                Id = t.Id,
                Type = t.Type,
                Amount = t.Amount,
                BalanceAfter = t.BalanceAfter,
                Description = t.Description,
                JobId = t.JobId,
                CreatedAt = t.CreatedAt
            }).ToList(),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
