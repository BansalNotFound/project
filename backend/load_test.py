import os
import tensorflow as tf
import keras
from keras.src.saving import serialization_lib

def l2_norm_func(x):
    import tensorflow as tf
    return tf.math.l2_normalize(x, axis=-1)

# Define our patched Lambda layer
class PatchedLambda(keras.layers.Lambda):
    def __init__(self, function=None, output_shape=None, mask=None, arguments=None, **kwargs):
        # Always enforce output_shape for our embedding layer
        if output_shape is None:
            output_shape = (128,)
        
        # ALWAYS replace with our safe L2 normalization function
        function = l2_norm_func
            
        super().__init__(function, output_shape=output_shape, mask=mask, arguments=arguments, **kwargs)

    def compute_output_shape(self, input_shape):
        if isinstance(input_shape, list) and len(input_shape) > 0:
            shape = input_shape[0]
        else:
            shape = input_shape
        return (shape[0], 128)

# Monkeypatch get_symbol_from_name
original_get_symbol_from_name = serialization_lib.api_export.get_symbol_from_name

def patched_get_symbol_from_name(name):
    if name == 'keras.layers.Lambda':
        return PatchedLambda
    return original_get_symbol_from_name(name)

serialization_lib.api_export.get_symbol_from_name = patched_get_symbol_from_name

model_path = '../models/recognition_embedding.keras'
print("File exists:", os.path.exists(model_path))

try:
    print("Testing tf.keras.models.load_model with patched symbol lookup...")
    model = tf.keras.models.load_model(model_path, safe_mode=False)
    print("SUCCESSFUL: Loaded successfully!")
    
    # Test prediction
    import numpy as np
    mock_input = np.random.rand(1, 112, 112, 3).astype(np.float32)
    output = model.predict(mock_input)
    print("Prediction shape:", output.shape)
    print("L2 Norm of embedding:", np.linalg.norm(output[0]))
except Exception as e:
    import traceback
    print("FAILED:", type(e).__name__, e)
    traceback.print_exc()
