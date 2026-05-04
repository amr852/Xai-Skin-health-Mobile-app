import cv2
import numpy as np

# Detection Functions
def is_blurry(image_path, threshold=100.0):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    variance = cv2.Laplacian(image, cv2.CV_64F).var()
    return variance < threshold

def is_low_light(image_path, threshold=50):
    image = cv2.imread(image_path)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    brightness = hsv[:, :, 2].mean()
    return brightness < threshold

def enhance_blurry_image(image):
    """Applies a sharpening filter to enhance blurry images."""
    kernel = np.array([[0, -1, 0],
                       [-1, 5,-1],
                       [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

def enhance_low_light_image(image):
    """Improves brightness and contrast for low-light images."""
    return cv2.convertScaleAbs(image, alpha=1.5, beta=30)
