import cv2
import numpy as np

def _read_bgr(image_or_path):
    """
    Accept a file path or an already loaded BGR image.
    Returns a BGR ndarray or None when input cannot be decoded.
    """
    if isinstance(image_or_path, np.ndarray):
        return image_or_path
    return cv2.imread(image_or_path)


def blur_variance(image_or_path):
    """Laplacian variance score (lower means blurrier)."""
    if isinstance(image_or_path, str):
        image = cv2.imread(image_or_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return 0.0
        return float(cv2.Laplacian(image, cv2.CV_64F).var())

    image = _read_bgr(image_or_path)
    if image is None:
        return 0.0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def brightness_score(image_or_path):
    """Mean V channel value in HSV color-space (0-255)."""
    image = _read_bgr(image_or_path)
    if image is None:
        return 0.0
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    return float(hsv[:, :, 2].mean())


# Detection Functions
def is_blurry(image_or_path, threshold=100.0):
    """
    Return True when the image appears blurry based on Laplacian variance.
    Accepts either a file path or an already loaded ndarray image.
    """
    if isinstance(image_or_path, str):
        image = cv2.imread(image_or_path, cv2.IMREAD_GRAYSCALE)
    else:
        image = _read_bgr(image_or_path)
        if image is not None and len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if image is None:
        return True

    variance = float(cv2.Laplacian(image, cv2.CV_64F).var())
    return bool(variance < float(threshold))


def is_low_light(image_or_path, threshold=50):
    return brightness_score(image_or_path) < float(threshold)

def enhance_blurry_image(image):
    """Applies a sharpening filter to enhance blurry images."""
    kernel = np.array([[0, -1, 0],
                       [-1, 5,-1],
                       [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)

def enhance_low_light_image(image):
    """Improves brightness and contrast for low-light images."""
    return cv2.convertScaleAbs(image, alpha=1.5, beta=30)
