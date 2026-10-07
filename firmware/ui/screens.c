#include <string.h>

#include "screens.h"
#include "images.h"
#include "fonts.h"
#include "actions.h"
#include "vars.h"
#include "styles.h"
#include "ui.h"

#include <string.h>

objects_t objects;

static const char *screen_names[] = { "Main", "health" };
static const char *object_names[] = { "main", "health", "hours", "minutes", "forward", "next", "day", "month", "year", "spo2", "heart_rate", "humidity", "temperature", "pm_rate", "backward", "back", "spo2_value", "temperature_value", "humidity_value", "pm_rate_value" };

//
// Event handlers
//

lv_obj_t *tick_value_change_obj;

static void event_handler_cb_main_forward(lv_event_t *e) {
    lv_event_code_t event = lv_event_get_code(e);
    void *flowState = lv_event_get_user_data(e);
    (void)flowState;
    
    if (event == LV_EVENT_CLICKED) {
        e->user_data = (void *)0;
        flowPropagateValueLVGLEvent(flowState, -1, 2, e);
    }
}

static void event_handler_cb_health_backward(lv_event_t *e) {
    lv_event_code_t event = lv_event_get_code(e);
    void *flowState = lv_event_get_user_data(e);
    (void)flowState;
    
    if (event == LV_EVENT_CLICKED) {
        e->user_data = (void *)0;
        flowPropagateValueLVGLEvent(flowState, -1, 3, e);
    }
}

//
// Screens
//

void create_screen_main() {
    void *flowState = getFlowState(0, 0);
    (void)flowState;
    lv_obj_t *obj = lv_obj_create(0);
    objects.main = obj;
    lv_obj_set_pos(obj, 0, 0);
    lv_obj_set_size(obj, 240, 240);
    {
        lv_obj_t *parent_obj = obj;
        {
            // hours
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.hours = obj;
            lv_obj_set_pos(obj, 77, 46);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_label_set_recolor(obj, true);
            lv_obj_set_style_pad_top(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_bottom(obj, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_left(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_right(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_64, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x02d9ff), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "10");
        }
        {
            // minutes
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.minutes = obj;
            lv_obj_set_pos(obj, 77, 120);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_label_set_recolor(obj, true);
            lv_obj_set_style_pad_top(obj, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_bottom(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_left(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_pad_right(obj, 5, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_64, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x02d9ff), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "30");
        }
        {
            // forward
            lv_obj_t *obj = lv_btn_create(parent_obj);
            objects.forward = obj;
            lv_obj_set_pos(obj, 173, 95);
            lv_obj_set_size(obj, 50, 50);
            lv_obj_add_event_cb(obj, event_handler_cb_main_forward, LV_EVENT_ALL, flowState);
            lv_obj_set_style_bg_color(obj, lv_color_hex(0x15171a), LV_PART_MAIN | LV_STATE_DEFAULT);
            {
                lv_obj_t *parent_obj = obj;
                {
                    // next
                    lv_obj_t *obj = lv_label_create(parent_obj);
                    objects.next = obj;
                    lv_obj_set_pos(obj, 0, 0);
                    lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
                    lv_obj_set_style_align(obj, LV_ALIGN_CENTER, LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_obj_set_style_text_color(obj, lv_color_hex(0x00ffc7), LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_label_set_text_static(obj, ">");
                }
            }
        }
        {
            // day
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.day = obj;
            lv_obj_set_pos(obj, 36, 85);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xb5ffbc), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "22");
        }
        {
            // month
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.month = obj;
            lv_obj_set_pos(obj, 31, 112);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xb5ffbc), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "Sep");
        }
        {
            // year
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.year = obj;
            lv_obj_set_pos(obj, 36, 138);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xb5ffbc), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "26");
        }
    }
    
    tick_screen_main();
}

void tick_screen_main() {
    void *flowState = getFlowState(0, 0);
    (void)flowState;
    {
        float timeline_position = getTimelinePosition(flowState);
        
        static struct {
            float last_timeline_position;
        } anim_state = { -1 };
        
        if (anim_state.last_timeline_position == -1) {
            anim_state.last_timeline_position = 0;
        }
        
        if (timeline_position != anim_state.last_timeline_position) {
            anim_state.last_timeline_position = timeline_position;
            
            {
                lv_obj_t *obj = objects.forward;

while (1) {
                    // keyframe #1
                    if (timeline_position < 0) {
                        break;
                    }
                    
                    break;
                }
                
                lv_style_value_t value;
            }
        }
    }
}

void create_screen_health() {
    void *flowState = getFlowState(0, 1);
    (void)flowState;
    lv_obj_t *obj = lv_obj_create(0);
    objects.health = obj;
    lv_obj_set_pos(obj, 0, 0);
    lv_obj_set_size(obj, 240, 240);
    {
        lv_obj_t *parent_obj = obj;
        {
            // spo2
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.spo2 = obj;
            lv_obj_set_pos(obj, 63, 38);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x00fbff), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "SpO2");
        }
        {
            // heartRate
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.heart_rate = obj;
            lv_obj_set_pos(obj, 92, 103);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_32, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xff4c4c), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "H/R");
        }
        {
            // humidity
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.humidity = obj;
            lv_obj_set_pos(obj, 63, 181);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x47ff4d), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "Humi");
        }
        {
            // temperature
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.temperature = obj;
            lv_obj_set_pos(obj, 133, 38);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xfffc0c), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "Temp");
        }
        {
            // pmRate
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.pm_rate = obj;
            lv_obj_set_pos(obj, 133, 181);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x00ff93), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "PM2.5");
        }
        {
            // backward
            lv_obj_t *obj = lv_btn_create(parent_obj);
            objects.backward = obj;
            lv_obj_set_pos(obj, 13, 95);
            lv_obj_set_size(obj, 50, 50);
            lv_obj_add_event_cb(obj, event_handler_cb_health_backward, LV_EVENT_ALL, flowState);
            lv_obj_set_style_bg_color(obj, lv_color_hex(0x15171a), LV_PART_MAIN | LV_STATE_DEFAULT);
            {
                lv_obj_t *parent_obj = obj;
                {
                    // back
                    lv_obj_t *obj = lv_label_create(parent_obj);
                    objects.back = obj;
                    lv_obj_set_pos(obj, 0, 0);
                    lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
                    lv_obj_set_style_align(obj, LV_ALIGN_CENTER, LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_obj_set_style_text_color(obj, lv_color_hex(0x00ffc7), LV_PART_MAIN | LV_STATE_DEFAULT);
                    lv_label_set_text_static(obj, "<");
                }
            }
        }
        {
            // spo2Value
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.spo2_value = obj;
            lv_obj_set_pos(obj, 63, 62);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x00fbff), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "SpO2");
        }
        {
            // temperatureValue
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.temperature_value = obj;
            lv_obj_set_pos(obj, 133, 62);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0xfffc0c), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "Temp");
        }
        {
            // humidityValue
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.humidity_value = obj;
            lv_obj_set_pos(obj, 63, 161);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x47ff4d), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "Humi");
        }
        {
            // pmRateValue
            lv_obj_t *obj = lv_label_create(parent_obj);
            objects.pm_rate_value = obj;
            lv_obj_set_pos(obj, 133, 161);
            lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
            lv_obj_set_style_text_font(obj, &ui_font_roboto_mono_16, LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_obj_set_style_text_color(obj, lv_color_hex(0x00ff93), LV_PART_MAIN | LV_STATE_DEFAULT);
            lv_label_set_text_static(obj, "PM2.5");
        }
    }
    
    tick_screen_health();
}

void tick_screen_health() {
    void *flowState = getFlowState(0, 1);
    (void)flowState;
}

typedef void (*tick_screen_func_t)();
tick_screen_func_t tick_screen_funcs[] = {
    tick_screen_main,
    tick_screen_health,
};
void tick_screen(int screen_index) {
    if (screen_index >= 0 && screen_index < 2) {
        tick_screen_funcs[screen_index]();
    }
}
void tick_screen_by_id(enum ScreensEnum screenId) {
    tick_screen(screenId - 1);
}

//
// Fonts
//

ext_font_desc_t fonts[] = {
    { "Roboto_Mono_32", &ui_font_roboto_mono_32 },
    { "Roboto_Mono_16", &ui_font_roboto_mono_16 },
    { "Roboto_Mono_64", &ui_font_roboto_mono_64 },
#if LV_FONT_MONTSERRAT_8
    { "MONTSERRAT_8", &lv_font_montserrat_8 },
#endif
#if LV_FONT_MONTSERRAT_10
    { "MONTSERRAT_10", &lv_font_montserrat_10 },
#endif
#if LV_FONT_MONTSERRAT_12
    { "MONTSERRAT_12", &lv_font_montserrat_12 },
#endif
#if LV_FONT_MONTSERRAT_14
    { "MONTSERRAT_14", &lv_font_montserrat_14 },
#endif
#if LV_FONT_MONTSERRAT_16
    { "MONTSERRAT_16", &lv_font_montserrat_16 },
#endif
#if LV_FONT_MONTSERRAT_18
    { "MONTSERRAT_18", &lv_font_montserrat_18 },
#endif
#if LV_FONT_MONTSERRAT_20
    { "MONTSERRAT_20", &lv_font_montserrat_20 },
#endif
#if LV_FONT_MONTSERRAT_22
    { "MONTSERRAT_22", &lv_font_montserrat_22 },
#endif
#if LV_FONT_MONTSERRAT_24
    { "MONTSERRAT_24", &lv_font_montserrat_24 },
#endif
#if LV_FONT_MONTSERRAT_26
    { "MONTSERRAT_26", &lv_font_montserrat_26 },
#endif
#if LV_FONT_MONTSERRAT_28
    { "MONTSERRAT_28", &lv_font_montserrat_28 },
#endif
#if LV_FONT_MONTSERRAT_30
    { "MONTSERRAT_30", &lv_font_montserrat_30 },
#endif
#if LV_FONT_MONTSERRAT_32
    { "MONTSERRAT_32", &lv_font_montserrat_32 },
#endif
#if LV_FONT_MONTSERRAT_34
    { "MONTSERRAT_34", &lv_font_montserrat_34 },
#endif
#if LV_FONT_MONTSERRAT_36
    { "MONTSERRAT_36", &lv_font_montserrat_36 },
#endif
#if LV_FONT_MONTSERRAT_38
    { "MONTSERRAT_38", &lv_font_montserrat_38 },
#endif
#if LV_FONT_MONTSERRAT_40
    { "MONTSERRAT_40", &lv_font_montserrat_40 },
#endif
#if LV_FONT_MONTSERRAT_42
    { "MONTSERRAT_42", &lv_font_montserrat_42 },
#endif
#if LV_FONT_MONTSERRAT_44
    { "MONTSERRAT_44", &lv_font_montserrat_44 },
#endif
#if LV_FONT_MONTSERRAT_46
    { "MONTSERRAT_46", &lv_font_montserrat_46 },
#endif
#if LV_FONT_MONTSERRAT_48
    { "MONTSERRAT_48", &lv_font_montserrat_48 },
#endif
};

//
//
//

void create_screens() {
    
    eez_flow_init_fonts(fonts, sizeof(fonts) / sizeof(ext_font_desc_t));

// Set default LVGL theme
    lv_disp_t *dispp = lv_disp_get_default();
    lv_theme_t *theme = lv_theme_default_init(dispp, lv_palette_main(LV_PALETTE_BLUE), lv_palette_main(LV_PALETTE_RED), true, LV_FONT_DEFAULT);
    lv_disp_set_theme(dispp, theme);
    
    // Initialize screens
    eez_flow_init_screen_names(screen_names, sizeof(screen_names) / sizeof(const char *));
    eez_flow_init_object_names(object_names, sizeof(object_names) / sizeof(const char *));
    
    // Create screens
    create_screen_main();
    create_screen_health();
}