#pragma once
#include <stdint.h>

template <typename T, uint8_t N>

class MicroMedianFilter{
    static_assert(N % 2 != 0, "Window size must be odd");

    private:
        T buffer[N] = {0}; //buffer to track the sample history
        uint8_t index = 0; //points to the next location to insert the next sample
        bool bufferFull = false; //flag to indicate if the buffer is full

        
        void insertionSort(T * arr, uint8_t len){
            for (uint8_t i = 1; i<len; i++){
                T key = arr[i];
                int16_t j = i - 1;
                while(j >= 0 && arr[j] > key){
                    arr[j+1] = arr[j];
                    j--;
                }
                arr[j+1] = key;
            }
        }

    public:
        MicroMedianFilter() {}

        T update(T newvalue){
            buffer[head] = newValue;
            head = (head + 1) % N;
            if (head == 0)bufferFull = true;

            uint8_t validSamples = bufferFull ? N : head;

            T sortedData[N];
            for(uint8_t i = 0; i < validSamples ; ++i){
                sortedData[i] = buffer[i];
            }

            insertionSort(sortedData, validSamples);

            return sortedData[validSamples/2];  
        }
};
