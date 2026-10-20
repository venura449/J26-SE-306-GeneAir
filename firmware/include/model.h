#pragma once
#include <TooN/TooN.h>

TooN::Vector<3> predict_vital_trend(const TooN::Matrix<60,3>& normalized_window);
