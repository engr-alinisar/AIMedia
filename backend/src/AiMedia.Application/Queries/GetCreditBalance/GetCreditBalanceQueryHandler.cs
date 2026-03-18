using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;

namespace AiMedia.Application.Queries.GetCreditBalance;

public class GetCreditBalanceQueryHandler(ICreditService creditService) : IRequestHandler<GetCreditBalanceQuery, CreditBalanceDto>
{
    public async Task<CreditBalanceDto> Handle(GetCreditBalanceQuery request, CancellationToken cancellationToken)
    {
        var (balance, reserved) = await creditService.GetBalanceAsync(request.UserId, cancellationToken);
        return new CreditBalanceDto(balance, reserved, balance + reserved);
    }
}
