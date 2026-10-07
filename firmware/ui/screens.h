#ifndef EEZ_LVGL_UI_SCREENS_H
#define EEZ_LVGL_UI_SCREENS_H

#include <lvgl/lvgl.h>

#ifdef __cplusplus
extern "C"
{
#endif

    // Screens

    enum ScreensEnum
    {
        _SCREEN_ID_FIRST = 1,
        SCREEN_ID_MAIN = 1,
        SCREEN_ID_HEALTH = 2,
        _SCREEN_ID_LAST = 2
    };

    typedef struct _objects_t
    {
        lv_obj_t *main;
        lv_obj_t *health;
        lv_obj_t *hours;
        lv_obj_t *minutes;
        lv_obj_t *forward;
        lv_obj_t *next;
        lv_obj_t *day;
        lv_obj_t *month;
        lv_obj_t *year;
        lv_obj_t *spo2;
        lv_obj_t *heart_rate;
        lv_obj_t *humidity;
        lv_obj_t *temperature;
        lv_obj_t *pm_rate;
        lv_obj_t *backward;
        lv_obj_t *back;
        lv_obj_t *spo2_value;
        lv_obj_t *temperature_value;
        lv_obj_t *humidity_value;
        lv_obj_t *pm_rate_value;
    } objects_t;

    extern objects_t objects;

    void create_screen_main();
    void tick_screen_main();

    void create_screen_health();
    void tick_screen_health();

    void tick_screen_by_id(enum ScreensEnum screenId);
    void tick_screen(int screen_index);

    void create_screens();

#ifdef __cplusplus
}
#endif

#endif // EEZ_LVGL_UI_SCREENS_H