#pragma once
#include <TooN/TooN.h>

void init_sensors();
void append_sensor_reading(float hr, float spo2, float temp);
bool is_window_full();

TooN::Matrix<60,3>get_normalized_window();