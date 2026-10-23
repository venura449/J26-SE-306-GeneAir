#include "model.h"
#include "weights.h"
#include <cmath>

using namespace TooN;

//mapping weights
static Matrix<67, 64> Wf = wrapMatrix<67,64>(Wf_data);
static Matrix<67, 64> Wi = wrapMatrix<67,64>(Wi_data);
static Matrix<67, 64> Wc = wrapMatrix<67,64>(Wc_data);
static Matrix<67, 64> Wo = wrapMatrix<67,64>(Wo_data);
static Matrix<64, 3> Wy = wrapMatrix<64,3>(Wy_data);

//mapping biases
static Vector<64> bf = wrapVector<64>(bf_data);
static Vector<64> bi = wrapVector<64>(bi_data);
static Vector<64> bc = wrapVector<64>(bc_data);
static Vector<64> bo = wrapVector<64>(bo_data);
static Vector<3> by = wrapVector<3>(by_data);


//activation functions
static Vector<64> sigmoid_vec(const Vector<64>& input) {
    Vector<64> output;
    for (int i=0; i<64; ++i){
        output[i] = 1.0f/(1.0f + std::exp(-input[i]));
    }
    return output;
}

static Vector<64> tanh_vec(const Vector<64>& input){
    Vector<64> output;
    for (int i=0; i<64; ++i){
        output[i] = std::tanh(input[i]);
    }
    return output;
}

Vector<3> predict_vital_trend(const Matrix<60,3>& normalized_window){
    Vector<64> h_t = Zeros;
    Vector<64> c_t = Zeros;

    //loop for 60s window
    for(int t=0; t<60; ++t){
        Vector<67> z;
        z.slice<0,64>() = h_t;
        z.slice<64,3>() = normalized_window[t];

        Vector<64> f_t = sigmoid_vec(Wf.T() * z + bf);
        Vector<64> i_t = sigmoid_vec(Wi.T() * z + bi);
        Vector<64> c_tilde = tanh_vec(Wc.T() * z + bc);

        for(int i=0; i<64; ++i){
            c_t[i] = f_t[i] * c_t[i] + i_t[i] * c_tilde[i];
        }

        Vector<64>o_t = sigmoid_vec(Wo.T() * z + bo);
        Vector<64> c_t_tanh = tanh_vec(c_t);

        for(int i=0; i<64; ++i) {
            h_t[i] = o_t[i] * c_t_tanh[i];
        }
    }
    
    return Wy.T() * h_t + by;
}