#include <Arduino.h>
#include "sensors.h"
#include "model.h"
#include "filters.h"
#include "weights.h"

MedianFilter hr_median;
EMAFilter hr_ema(FILTER_FAST);

MedianFilter spo2_median;
EMAFilter spo2_ema(FILTER_FAST);

void setup()
{

    Serial.begin(115200);
    init_sensors();

    delay(5000);
    Serial.println("Starting edge simulation");
}

void loop()
{
    
}
