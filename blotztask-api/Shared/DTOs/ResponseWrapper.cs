
namespace BlotzTask.Shared.DTOs;
public class ResponseWrapper<T>
{
    public T Data { get; set; }
    public string Message { get; set; }
    public bool Success { get; set; }

    public ResponseWrapper(T data, string message, bool success)
    {
        Data = data;
        Message = message;
        Success = success;
    }
}
