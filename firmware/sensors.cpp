#include "sensors.h"

//normalizes exported from python
const float X_mean[3]={85.66019833333343f, 95.53974750000035f, 36.81016291666692f};
const float X_std[3]={19.54076629324761f, 4.647217219610812f, 0.4191117284903204f};

static TooN::Matrix<60,3> rolling_buffer;
static int tick_count=0;

void init_sensors(){
    //initializing the i2c/spi pins
    tick_count=0;
}

void append_sensor_reading(float hr, float spo2, float temp){
    //shifting old values up
    for (int i=0;i<59;++i){
        rolling_buffer[i] = rolling_buffer[i+1];
    }

    //inserting new values at the bottom
    rolling_buffer[59][0]=hr;
    rolling_buffer[59][1]=spo2;
    rolling_buffer[59][2]=temp;

    if(tick_count<60){
        tick_count++;
    }
}

bool is_window_full(){
    return tick_count>=60;
}

TooN::Matrix<60,3>get_normalized_window(){
    TooN::Matrix<60,3>norm_window;
    for(int i=0;i<60;++i){
        norm_window[i][0] = (rolling_buffer[i][0] - X_mean[0]) /X_std[0];
        norm_window[i][1] = (rolling_buffer[i][1] - X_mean[1]) /X_std[1];
        norm_window[i][2] = (rolling_buffer[i][2] - X_mean[2]) /X_std[2];
    }
    return norm_window;
}

