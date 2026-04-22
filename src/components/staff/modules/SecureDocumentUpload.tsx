'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, X, CheckCircle, Loader2, Shield, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { openDoc } from '@/utils/openDoc';

interface SecureDocumentUploadProps {
  loanApplicationId: string;
  userId: string;
  userRole: string;
  onUploadComplete?: (documentId: string) => void;
  existingDocuments?: Array<{
    id: string;
    documentUrl: string;
    documentName: string;
    remarks: string;
    createdAt: string;
  }>;
}

export default function SecureDocumentUpload({
  loanApplicationId,
  userId,
  userRole,
  onUploadComplete,
  existingDocuments = []
}: SecureDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState('');
  const [documents, setDocuments] = useState(existingDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64 for serverless compatibility
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch('/api/upload/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            filename: selectedFile.name,
            documentType: 'SECURE_DOCUMENT',
            uploadedBy: userId,
            fileType: selectedFile.type
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Now save to SecureDocument table
        const secureDocResponse = await fetch('/api/secure-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanApplicationId,
            documentType: 'SECURE_DOCUMENT',
            documentUrl: data.url,
            documentName: selectedFile.name,
            documentSize: selectedFile.size,
            mimeType: selectedFile.type,
            remarks,
            uploadedById: userId,
            uploadedByRole: userRole
          })
        });

        const secureDocData = await secureDocResponse.json();

        if (!secureDocResponse.ok) {
          throw new Error(secureDocData.error || 'Failed to save document');
        }

        toast({
          title: 'Document Uploaded',
          description: 'Secure document has been uploaded successfully'
        });

        setDocuments(prev => [...prev, secureDocData.document]);
        setSelectedFile(null);
        setRemarks('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onUploadComplete?.(secureDocData.document.id);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Shield className="h-5 w-5" />
          Secure Document Upload
          <Badge className="bg-purple-200 text-purple-700">Interest Only Loan</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-purple-100 border-purple-200">
          <Info className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-700 text-sm">
            Upload any document format (PDF, Image, Word, Excel, etc.). This document will be stored securely.
            Maximum file size: 10MB.
          </AlertDescription>
        </Alert>

        {/* File Upload Area */}
        <div className="space-y-3">
          <Label>Select Document</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              variant="outline"
              className="flex-1 border-dashed border-2 border-purple-300 hover:border-purple-400"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedFile ? 'Change File' : 'Select File'}
            </Button>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this document..."
              rows={2}
            />
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Secure Document
                </>
              )}
            </Button>
          )}
        </div>

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-200">
            <h4 className="text-sm font-medium text-purple-800 mb-3">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{doc.documentName}</p>
                      {doc.remarks && (
                        <p className="text-xs text-gray-500">{doc.remarks}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDoc(doc.documentUrl)}
                    className="text-purple-600 hover:text-purple-700 text-sm"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
