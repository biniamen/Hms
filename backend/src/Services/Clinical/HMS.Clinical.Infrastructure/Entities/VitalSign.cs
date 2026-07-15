using HMS.SharedKernel;

namespace HMS.Clinical.Infrastructure.Entities;

public class VitalSign : Entity
{
    public Guid PatientId { get; set; }
    public decimal TemperatureC { get; set; }
    public int Pulse { get; set; }
    public int RespiratoryRate { get; set; }
    public string BloodPressure { get; set; } = string.Empty;
    public decimal WeightKg { get; set; }
    public decimal HeightCm { get; set; }
}
