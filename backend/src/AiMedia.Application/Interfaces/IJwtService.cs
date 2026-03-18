using AiMedia.Domain.Entities;

namespace AiMedia.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    Guid? ValidateToken(string token);
}
