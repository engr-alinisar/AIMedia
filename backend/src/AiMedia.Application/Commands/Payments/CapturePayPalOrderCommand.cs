using MediatR;

namespace AiMedia.Application.Commands.Payments;

public record CapturePayPalOrderCommand(string OrderId) : IRequest<bool>;
