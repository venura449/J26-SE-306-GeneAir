#include <Arduino.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <Wire.h>
#include <lvgl.h>
#include <time.h>
#include "SensorQMI8658.hpp"

// Ui headers
#include "ui/ui.h"
#include "ui/screens.h"

// LSTM and sensor headers
#include "sensors.h"
#include "model.h"
#include "weights.h"
#include "filters.h"

#define I2C_SDA 6
#define I2C_SCL 7
#define TP_RST 22
#define CST816S_ADDR 0x15

#define I2C0_SDA 4
#define I2C0_SCL 5

static const uint16_t screenWidth = 240;
static const uint16_t screenHeight = 240;

TFT_eSPI tft = TFT_eSPI(screenWidth, screenHeight);

static lv_disp_draw_buf_t draw_buf;
static lv_color_t buf[screenWidth * screenHeight / 10];

void display_flush(lv_disp_drv_t *disp_drv, const lv_area_t *area, lv_color_t *color_p)
{

    uint32_t w = (area->x2 - area->x1 + 1);
    uint32_t h = (area->y2 - area->y1 + 1);

    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.pushColors((uint16_t *)&color_p->full, w * h, true);
    tft.endWrite();

    lv_disp_flush_ready(disp_drv);
}

void touch_read(lv_indev_drv_t *indev_drv, lv_indev_data_t *data)
{
    Wire1.beginTransmission(CST816S_ADDR);
    Wire1.write(0x01);
    if (Wire1.endTransmission(false) == 0)
    {
        Wire1.requestFrom(CST816S_ADDR, 6);
        if (Wire1.available() >= 6)
        {
            uint8_t points = Wire1.read();
            points = Wire1.read();
            uint8_t xh = Wire1.read();
            uint8_t xl = Wire1.read();
            uint8_t yh = Wire1.read();
            uint8_t yl = Wire1.read();

            if (points > 0)
            {
                data->state = LV_INDEV_STATE_PR;
                data->point.x = ((xh & 0x0F) << 8) | xl;
                data->point.y = ((yh & 0x0F) << 8) | yl;
                return;
            }
        }
    }
    data->state = LV_INDEV_STATE_REL;
}

// ui navigation methods
void navigate_to_health(lv_event_t *e)
{
    if (objects.health != NULL)
    {
        lv_scr_load_anim(objects.health, LV_SCR_LOAD_ANIM_NONE, 0, 0, false);
    }
}
void navigate_to_main(lv_event_t *e)
{
    if (objects.main != NULL)
    {
        lv_scr_load_anim(objects.main, LV_SCR_LOAD_ANIM_NONE, 0, 0, false);
    }
}

// median and ema filters for sensors
MedianFilter hr_median;
EMAFilter hr_ema(FILTER_FAST);

MedianFilter spo2_median;
EMAFilter spo2_ema(FILTER_FAST);

EMAFilter temp_ema(FILTER_MEDIUM);

void setup()
{
    Serial.begin(115200);
    init_sensors();

    uint32_t start_wait = millis();
    while (!Serial && (millis() - start_wait < 5000))
    {
        delay(10);
    }

    // turn on the backlight
    pinMode(25, OUTPUT);
    digitalWrite(25, HIGH);

    // initialize the display
    tft.begin();
    tft.setRotation(0);

    // reset touch controller in wire1
    pinMode(TP_RST, OUTPUT);
    digitalWrite(TP_RST, LOW);
    delay(20);
    digitalWrite(TP_RST, HIGH);
    delay(50);

    Wire1.setSDA(I2C_SDA);
    Wire1.setSCL(I2C_SCL);
    Wire1.begin();

    // lvgl initialization
    lv_init();
    lv_disp_draw_buf_init(&draw_buf, buf, NULL, screenWidth * screenHeight / 10);

    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res = screenWidth;
    disp_drv.ver_res = screenHeight;
    disp_drv.flush_cb = display_flush;
    disp_drv.draw_buf = &draw_buf;
    lv_disp_drv_register(&disp_drv);

    // touch controller initialization
    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = touch_read;
    lv_indev_drv_register(&indev_drv);

    struct tm t;
    t.tm_year = 2026 - 1900;
    t.tm_mon = 10 - 1;
    t.tm_mday = 12;
    t.tm_hour = 23;
    t.tm_min = 48;
    t.tm_sec = 21;
    time_t epoch = mktime(&t);
    struct timeval tv = {epoch, 0};
    settimeofday(&tv, nullptr);

    ui_init();

    if (objects.forward != NULL)
    {
        lv_obj_add_event_cb(objects.forward, navigate_to_health, LV_EVENT_CLICKED, NULL);
    }
    if (objects.backward != NULL)
    {
        lv_obj_add_event_cb(objects.backward, navigate_to_main, LV_EVENT_CLICKED, NULL);
    }
}

float simulated_hr = 50.0f;
float simulated_spo2 = 98.0f;

void loop()
{
    ui_tick();

    static uint32_t last_tick = 0;
    uint32_t current_time = millis();
    uint32_t elapsed_time = current_time - last_tick;

    if (elapsed_time >= 5)
    {
        lv_tick_inc(elapsed_time);
        last_tick = current_time;
        lv_timer_handler();
    }

    static uint32_t last_clock_update = 0;
    if (millis() - last_clock_update > 1000)
    {
        last_clock_update = millis();
        time_t now;
        struct tm *timeinfo;
        time(&now);
        timeinfo = localtime(&now);

        if (objects.hours != NULL)
            lv_label_set_text_fmt(objects.hours, "%02d", timeinfo->tm_hour);
        if (objects.minutes != NULL)
            lv_label_set_text_fmt(objects.minutes, "%02d", timeinfo->tm_min);
        if (objects.day != NULL)
            lv_label_set_text_fmt(objects.day, "%02d", timeinfo->tm_mday);
        if (objects.month != NULL)
        {
            char month_str[4];
            strftime(month_str, sizeof(month_str), "%b", timeinfo);
            lv_label_set_text_fmt(objects.month, month_str);
        }
        if (objects.year != NULL)
            lv_label_set_text_fmt(objects.year, "%02d", timeinfo->tm_year % 100);
    }
    static uint32_t last_vitals_poll = 0;
    static int seconds_passed = 0;

    if (millis() - last_vitals_poll >= 1000)
    {
        last_vitals_poll = millis();

        // 1. Generate Simulated Data (Fixed double declaration)
        float raw_hr = 85.0f + ((random(0, 10)) / 10.0f);
        float raw_spo2 = 98.0f + ((random(-2, 3)) / 10.0f);
        float raw_temp = 37.0f + ((random(-1, 2)) / 10.0f);

        // 2. Filter Data
        float clean_hr = hr_ema.process(hr_median.process(raw_hr));
        float clean_spo2 = spo2_ema.process(spo2_median.process(raw_spo2));
        float clean_temp = temp_ema.process(raw_temp);

        append_sensor_reading(clean_hr, clean_spo2, clean_temp);
        seconds_passed++;

        // 3. Run LSTM Inference
        if (is_window_full())
        {
            TooN::Matrix<60, 3> norm_window = get_normalized_window();
            TooN::Vector<3> pred_norm = predict_vital_trend(norm_window);

            float hr_rate = (pred_norm[0] * y_std_data[0]) + y_mean_data[0];
            float spo2_rate = (pred_norm[1] * y_std_data[1]) + y_mean_data[1];
            float temp_rate = (pred_norm[2] * y_std_data[2]) + y_mean_data[2];

            const char *hr_dir = (hr_rate > 0.15f) ? "upward" : (hr_rate < -0.15f) ? "downward"
                                                                                   : "stable";
            const char *spo2_dir = (spo2_rate > 0.02f) ? "upward" : (spo2_rate < -0.02f) ? "downward"
                                                                                         : "stable";
            const char *temp_dir = (temp_rate > 0.01f) ? "upward" : (temp_rate < -0.01f) ? "downward"
                                                                                         : "stable";

            // Keep your Serial prints for debugging
            Serial.print("{ \"hr\": \"");
            Serial.print(hr_dir);
            Serial.print("\", \"hr_rate\": ");
            Serial.print(hr_rate, 3);
            Serial.print(", \"hr_raw\": ");
            Serial.print(raw_hr, 3);
            Serial.print(", \"spo2\": \"");
            Serial.print(spo2_dir);
            Serial.print("\", \"spo2_rate\": ");
            Serial.print(spo2_rate, 3);
            Serial.print(", \"spo2_raw\": ");
            Serial.print(raw_spo2, 3);
            Serial.print("\", \"temp\": \"");
            Serial.print(temp_dir);
            Serial.println("\" }");

            // 4. Update the LVGL Watch Face UI
            if (objects.heart_rate != NULL)
                lv_label_set_text_fmt(objects.heart_rate, "%.0f %s", clean_hr, hr_dir);
            if (objects.spo2_value != NULL)
                lv_label_set_text_fmt(objects.spo2_value, "%.1f%% %s", clean_spo2, spo2_dir);
            if (objects.temperature_value != NULL)
                lv_label_set_text_fmt(objects.temperature_value, "%.1fC %s", clean_temp, temp_dir);
        }
        else
        {
            Serial.printf("Buffering... %d/60\n", seconds_passed);

            // Show buffering state on the watch face
            if (objects.heart_rate != NULL)
                lv_label_set_text(objects.heart_rate, "Buffering");
        }
    }
}