using MediatR;

namespace AiMedia.Application.Commands.Payments;

public record CreatePayPalOrderCommand(Guid UserId, string PackId) : IRequest<string>;
