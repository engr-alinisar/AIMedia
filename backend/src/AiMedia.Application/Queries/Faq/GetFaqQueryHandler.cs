using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.Faq;

public class GetFaqQueryHandler(IAppDbContext db) : IRequestHandler<GetFaqQuery, List<FaqItemDto>>
{
    public async Task<List<FaqItemDto>> Handle(GetFaqQuery request, CancellationToken cancellationToken)
    {
        return await db.FaqItems
            .Where(f => f.IsActive)
            .OrderBy(f => f.Category)
            .ThenBy(f => f.Order)
            .Select(f => new FaqItemDto(f.Id, f.Question, f.Answer, f.Category, f.Order))
            .ToListAsync(cancellationToken);
    }
}
