using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetCreditBalance;

public record GetCreditBalanceQuery(Guid UserId) : IRequest<CreditBalanceDto>;
