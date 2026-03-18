using Microsoft.AspNetCore.SignalR;

namespace AiMedia.Worker.Hubs;

/// <summary>
/// Stub hub used by the Worker to obtain IHubContext&lt;GenerationHub&gt;.
/// SignalR uses the class name ("GenerationHub") as the Redis channel key,
/// so this routes to the same Redis channels as AiMedia.API.Hubs.GenerationHub.
/// </summary>
public class GenerationHub : Hub<IGenerationHubClient>
{
}
