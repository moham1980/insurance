import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploader, type UploadedFile } from './FileUploader';

describe('FileUploader', () => {
  it('renders label and description', () => {
    render(<FileUploader label="Upload ID" description="PDF only" />);
    expect(screen.getByText('Upload ID')).toBeInTheDocument();
    expect(screen.getByText('PDF only')).toBeInTheDocument();
  });

  it('renders uploaded files list', () => {
    const files: UploadedFile[] = [
      { id: '1', name: 'doc.pdf', size: 1024, type: 'application/pdf' },
    ];
    render(<FileUploader uploadedFiles={files} />);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('fires onRemove when remove button clicked', () => {
    const onRemove = jest.fn();
    const files: UploadedFile[] = [
      { id: '1', name: 'doc.pdf', size: 1024, type: 'application/pdf' },
    ];
    render(<FileUploader uploadedFiles={files} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('حذف doc.pdf'));
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('is disabled when disabled prop is set', () => {
    const { container } = render(<FileUploader disabled />);
    const dropzone = container.querySelector('[class*="border-dashed"]');
    expect(dropzone).toHaveClass('opacity-50');
  });
});
