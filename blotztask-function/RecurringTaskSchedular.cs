using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Functions;

public class RecurringTaskScheduler
{
    private readonly ILogger<RecurringTaskScheduler> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public RecurringTaskScheduler(
        ILogger<RecurringTaskScheduler> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory; 
        _configuration = configuration;
    }

    [Function("RecurringTaskScheduler")]
    public async Task Run([TimerTrigger("*/10 * * * * *")] TimerInfo myTimer)
    {
        _logger.LogInformation($"Isolated function triggered at: {DateTime.UtcNow}");

        try
        {
            var client = _httpClientFactory.CreateClient();

            var endpoint = _configuration["RecurringTaskTriggerUrl"];
            var response = await client.PostAsync(endpoint, new StringContent(""));
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully triggered API endpoint.");
                Console.WriteLine(response);
            }
            else
            {
                _logger.LogWarning($"API call failed. Status code: {response.StatusCode}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling API endpoint.");
        }
    }
}