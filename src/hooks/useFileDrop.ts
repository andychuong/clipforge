import { useEffect, useRef } from 'react';

export function useFileDrop(
  onDrop: (files: File[]) => void,
  enabled: boolean = true
) {
  const onDropRef = useRef(onDrop);
  
  // Update ref when onDrop changes
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);
  
  useEffect(() => {
    if (!enabled) return;

    console.log('Using browser file drop API');
    
    // Only handle drop events for external files - don't interfere with dragover
    const handleDrop = async (e: DragEvent) => {
      // Only handle drops with actual files (external drops from Finder)
      const hasFiles = e.dataTransfer?.files && e.dataTransfer.files.length > 0;
      const hasJson = e.dataTransfer?.types.includes('application/json');
      
      if (hasFiles && !hasJson) {
        // External file drop
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Browser drop handler triggered - external files');
        const files = Array.from(e.dataTransfer.files);
        console.log('Dropped files:', files.map(f => f.name));
        onDropRef.current(files);
      }
    };

    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('drop', handleDrop);
    };
  }, [enabled]); // Remove onDrop from dependencies
}

