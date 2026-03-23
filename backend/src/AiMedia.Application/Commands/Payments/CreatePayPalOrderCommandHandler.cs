using AiMedia.Application.Interfaces;
using MediatR;

namespace AiMedia.Application.Commands.Payments;

public static class CreditPacks
{
    public static readonly Dictionary<string, (string Label, int Credits, decimal Price)> All = new()
    {
        ["starter"] = ("Starter Pack", 500,  5.00m),
        ["popular"]  = ("Popular Pack",  1200, 10.00m),
        ["pro"]      = ("Pro Pack",      3000, 20.00m),
    };
}

public class CreatePayPalOrderCommandHandler(IPayPalService paypal)
    : IRequestHandler<CreatePayPalOrderCommand, string>
{
    public async Task<string> Handle(CreatePayPalOrderCommand request, CancellationToken ct)
    {
        if (!CreditPacks.All.TryGetValue(request.PackId.ToLower(), out var pack))
            throw new ArgumentException($"Unknown credit pack: {request.PackId}");

        return await paypal.CreateOrderAsync(request.PackId, pack.Price, request.UserId, ct);
    }
}
