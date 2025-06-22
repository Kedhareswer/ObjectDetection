import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";

interface Prediction {
  className: string;
  probability: number;
}

interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
}

const MODELS: ModelInfo[] = [
  {
    name: "mobilenet",
    displayName: "MobileNet v2",
    description: "Fast and efficient model for general image classification with 1000+ object categories",
  },
];

export function ImageClassifier() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedModel] = useState<ModelInfo>(MODELS[0]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const saveClassification = useMutation(api.images.saveClassification);

  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        // Set backend to webgl for better performance
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('TensorFlow.js initialized with backend:', tf.getBackend());
        
        // Preload the model
        toast.loading('Loading AI model...', { id: 'model-init' });
        const loadedModel = await mobilenet.load({
          version: 2,
          alpha: 1.0,
        });
        setModel(loadedModel);
        toast.dismiss('model-init');
        toast.success('AI model loaded successfully!');
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js:', error);
        toast.error('Failed to initialize AI models');
      }
    };
    initTensorFlow();
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setPredictions([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const classifyImage = async () => {
    if (!selectedImage || !imagePreview || !model) {
      if (!model) {
        toast.error('AI model is still loading. Please wait...');
      }
      return;
    }

    setIsClassifying(true);
    const startTime = Date.now();

    try {
      toast.loading('Processing image...', { id: 'image-processing' });
      
      // Create image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imagePreview;
      });

      // Classify the image using MobileNet
      const predictions = await model.classify(img, 5);
      
      const results: Prediction[] = predictions.map(pred => ({
        className: pred.className,
        probability: pred.probability,
      }));
      
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      
      setPredictions(results);
      setProcessingTime(processingTimeMs);

      toast.dismiss('image-processing');
      toast.loading('Saving results...', { id: 'saving-results' });

      // Upload image and save classification
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': selectedImage.type },
        body: selectedImage,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { storageId } = await uploadResponse.json();
      
      await saveClassification({
        imageId: storageId,
        modelName: selectedModel.name,
        predictions: results,
        processingTime: processingTimeMs,
      });

      toast.dismiss('saving-results');
      toast.success(`Image classified in ${processingTimeMs}ms`);

    } catch (error) {
      console.error('Classification error:', error);
      toast.dismiss();
      toast.error('Failed to classify image. Please try again.');
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Status */}
      {!model && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-yellow-800 font-medium">Loading AI model...</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">Please wait while we initialize the image classification model.</p>
        </div>
      )}

      {/* Image Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Image</h3>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {imagePreview ? (
            <div className="space-y-4">
              <img
                src={imagePreview}
                alt="Selected"
                className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm"
              />
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={classifyImage}
                  disabled={isClassifying || !model}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isClassifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Classifying...
                    </div>
                  ) : !model ? (
                    'Loading Model...'
                  ) : (
                    'Classify Image'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">Drop an image here</p>
                <p className="text-gray-500">or click to browse your files</p>
                <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG, WebP up to 10MB</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose Image
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
          className="hidden"
        />
      </div>

      {/* Results */}
      {predictions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Classification Results</h3>
            <div className="text-right">
              <div className="text-sm text-gray-500">Processing Time</div>
              <div className="text-lg font-semibold text-green-600">{processingTime}ms</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {predictions.map((prediction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {prediction.className}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${prediction.probability * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {(prediction.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Model: {selectedModel.displayName}</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">{selectedModel.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
