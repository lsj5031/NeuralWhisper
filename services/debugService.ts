/**
 * Debug service to help troubleshoot API requests
 */

export const logFormData = (formData: FormData) => {
  // FormData contents can't be directly logged, so we reconstruct what was sent
  console.log('FormData fields being sent:');
  
  // Approximate logging of form data
  // Note: We can't iterate FormData directly in browser, so this is informational
  console.log('  (Use Network tab in DevTools to see actual request body)');
};

export const logRequest = (
  method: string,
  url: string,
  config: any,
  data?: any
) => {
  console.log(`🔍 API Request:`, {
    method,
    url,
    config: {
      baseUrl: config.baseUrl,
      hasAdminKey: !!config.adminKey,
    },
    data: data ? {
      hasFile: !!data.file,
      fileName: data.file?.name,
      fileType: data.file?.type,
      fileSize: data.file?.size,
      model: data.model,
      language: data.language,
      task: data.task,
      temperature: data.temperature,
    } : null,
  });
};

export const logResponse = (status: number, statusText: string, data?: any) => {
  console.log(`📡 API Response:`, {
    status,
    statusText,
    hasData: !!data,
    data: data ? (typeof data === 'string' ? data.substring(0, 100) : data) : null,
  });
};

export const logError = (error: Error | string, context?: string) => {
  console.error(`❌ API Error${context ? ` (${context})` : ''}:`, error);
};
