using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.Faq;

public record GetFaqQuery : IRequest<List<FaqItemDto>>;
