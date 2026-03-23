using MediatR;

namespace AiMedia.Application.Commands.Payments;

public record ProcessPayPalWebhookCommand(
    string WebhookId,
    string TransmissionId,
    string TransmissionTime,
    string CertUrl,
    string AuthAlgo,
    string TransmissionSig,
    string RawBody) : IRequest<bool>;
