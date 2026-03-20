FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files for restore layer caching
COPY AiMedia.sln ./
COPY src/AiMedia.Domain/AiMedia.Domain.csproj           src/AiMedia.Domain/
COPY src/AiMedia.Application/AiMedia.Application.csproj src/AiMedia.Application/
COPY src/AiMedia.Infrastructure/AiMedia.Infrastructure.csproj src/AiMedia.Infrastructure/
COPY src/AiMedia.FalAi/AiMedia.FalAi.csproj             src/AiMedia.FalAi/
COPY src/AiMedia.API/AiMedia.API.csproj                 src/AiMedia.API/
COPY src/AiMedia.Worker/AiMedia.Worker.csproj           src/AiMedia.Worker/
RUN dotnet restore src/AiMedia.Worker/AiMedia.Worker.csproj

# Copy all source and publish
COPY . .
RUN dotnet publish src/AiMedia.Worker/AiMedia.Worker.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AiMedia.Worker.dll"]
