#include "filters.h"

EMAFilter::EMAFilter(FilterIntensity intensity)
{
    is_initialized = false;
    current_value = 0.0f;

    switch (intensity)
    {
    case FILTER_FAST:
        alpha = 0.6f;
        break;
    case FILTER_MEDIUM:
        alpha = 0.15f;
        break;
    case FILTER_SLOW:
        alpha = 0.05f;
        break;
    default:
        alpha = 0.15f;
        break;
    }
}

float EMAFilter::process(float new_value)
{
    if (!is_initialized)
    {
        current_value = new_value;
        is_initialized = true;
    }
    else
    {
        current_value = (alpha * new_value) + ((1.0f - alpha) * current_value);
    }

    return current_value;
}

MedianFilter::MedianFilter()
{
    index = 0;
    is_filled = false;
    for (int i = 0; i < WINDOW_SIZE; ++i)
    {
        buffer[i] = 0.0f;
    }
}

float MedianFilter::process(float new_value)
{
    buffer[index] = new_value;
    index = (index + 1) % WINDOW_SIZE;
    if (index == 0)
    {
        is_filled = true;
    }
    // determine how many values to sort (if not filled, only sort the filled portion)
    int count = is_filled ? WINDOW_SIZE : (index == 0 ? WINDOW_SIZE : index);

    // copy the values to a temporary array for sorting
    float sorted[WINDOW_SIZE];
    for (int i = 0; i < count; ++i)
    {
        sorted[i] = buffer[i];
    }

    // sort the temporary array
    for (int i = 0; i < count; ++i)
    {
        float key = sorted[i];
        int j = i - 1;
        while (j >= 0 && sorted[j] > key)
        {
            sorted[j + 1] = sorted[j];
            j = j - 1;
        }
        sorted[j + 1] = key;
    }

    // return the median value
    if (count % 2 == 1)
    {
        return sorted[count / 2];
    }
    else
    {
        return (sorted[(count / 2) - 1] + sorted[count / 2]) / 2.0f;
    }
}