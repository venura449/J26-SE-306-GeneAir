#ifndef FILTERS_H
#define FILTERS_H

enum FilterIntensity
{
    FILTER_FAST,   // low smoothing, high responsiveness(alpha ~0.6)
    FILTER_MEDIUM, // medium smoothing, medium responsiveness(alpha ~0.15)
    FILTER_SLOW,   // high smoothing, low responsiveness(alpha ~0.05)
};

// EMA filter
class EMAFilter
{
private:
    float alpha;
    float current_value;
    bool is_initialized;

public:
    EMAFilter(FilterIntensity intensity);
    float process(float new_value);
};

class MedianFilter
{
private:
    static const int WINDOW_SIZE = 3;
    float buffer[WINDOW_SIZE];
    int index;
    bool is_filled;

public:
    MedianFilter();
    float process(float new_value);
};

#endif