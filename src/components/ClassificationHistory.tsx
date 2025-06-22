import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ClassificationHistorySkeleton } from "./Skeleton";

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  mobilenet: "MobileNet v2",
  efficientnet: "EfficientNet B0",
  inception: "Inception v3",
};

export function ClassificationHistory() {
  const classifications = useQuery(api.images.getClassifications);

  if (classifications === undefined) {
    return <ClassificationHistorySkeleton />;
  }

  if (classifications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Classifications Yet</h3>
        <p className="text-gray-600">Start by classifying some images to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-1">Classification History</h2>
        <p className="text-gray-600">
          {classifications.length} image{classifications.length !== 1 ? 's' : ''} classified
        </p>
      </div>
      
      <div className="space-y-4">
        {classifications.map((classification, index) => (
          <div
            key={classification._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex gap-6">
              {classification.imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={classification.imageUrl}
                    alt="Classified"
                    className="w-24 h-24 object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {MODEL_DISPLAY_NAMES[classification.modelName] || classification.modelName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>{new Date(classification._creationTime).toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {classification.processingTime}ms
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Top Predictions:</h4>
                  {classification.predictions.slice(0, 3).map((prediction, predIndex) => (
                    <div
                      key={predIndex}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {predIndex + 1}
                        </div>
                        <span className="font-medium text-gray-900">{prediction.className}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${prediction.probability * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-10 text-right">
                          {(prediction.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
