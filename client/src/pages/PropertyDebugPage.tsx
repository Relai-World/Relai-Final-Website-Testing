import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function PropertyDebugPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/property-by-id', id],
    queryFn: async () => {
      console.log(`[DEBUG] Fetching property with ID: ${id}`);
      const response = await apiRequest<any>(`/api/property-by-id/${encodeURIComponent(id!)}`);
      console.log('[DEBUG] API Response:', response);
      return response;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Property Debug Page</h1>
        <p>Loading property {id}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Property Debug Page</h1>
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Property Debug Page</h1>
      <p><strong>Property ID:</strong> {id}</p>
      <p><strong>Data loaded:</strong> {data ? 'Yes' : 'No'}</p>
      
      {data && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Raw API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
          
          {data.property && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">Property Details:</h2>
              <p><strong>Project Name:</strong> {data.property.ProjectName}</p>
              <p><strong>Builder Name:</strong> {data.property.BuilderName}</p>
              <p><strong>Configurations:</strong> {data.property.configurations?.length || 0}</p>
              <p><strong>Images:</strong> {data.property.images?.length || 0}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}