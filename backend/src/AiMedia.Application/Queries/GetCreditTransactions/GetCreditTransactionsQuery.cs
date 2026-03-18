using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetCreditTransactions;

public record GetCreditTransactionsQuery(Guid UserId, int Page = 1, int PageSize = 20) : IRequest<PagedResult<CreditTransactionDto>>;
