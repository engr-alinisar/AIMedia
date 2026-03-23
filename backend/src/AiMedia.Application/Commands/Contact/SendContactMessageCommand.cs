using MediatR;

namespace AiMedia.Application.Commands.Contact;

public record SendContactMessageCommand(
    string Name,
    string Email,
    string Subject,
    string Message,
    Guid? UserId // optional, if logged in
) : IRequest<Unit>;
