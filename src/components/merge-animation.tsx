import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { CheckCircle, Download, File, FileSpreadsheet, FileText, Image, LineChart, Package, Presentation, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getBrandedDocumentBase } from "@/lib/branding";

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface MergeAnimationProps {
  files: FileItem[];
  isActive: boolean;
  onComplete: () => void;
  outputFormat: string;
  documentName?: string;
}

const MergeAnimation = ({ files, isActive, onComplete, outputFormat, documentName }: MergeAnimationProps) => {
  const [stage, setStage] = useState<"preparing" | "merging" | "finalizing" | "complete">("preparing");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [pipelineProgress, setPipelineProgress] = useState([0, 0, 0]);
  const springProgress = useSpring(0, { stiffness: 80, damping: 20, mass: 0.6 });
  const progressRef = useRef(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const rafRef = useRef<number>();

  const stages = useMemo(() => ["Preflight", "Processing", "Finalizing", "Complete"] as const, []);

  const progressTargets: Record<typeof stages[number], number> = {
    Preflight: 20,
    Processing: 75,
    Finalizing: 95,
    Complete: 100,
  };

  const stageSummaries: Record<typeof stages[number], { title: string; description: string }> = {
    Preflight: {
      title: "Preparing files",
      description: "Validating uploads and setting up converters",
    },
    Processing: {
      title: "Merging documents",
      description: "Combining content in requested order",
    },
    Finalizing: {
      title: "Packaging output",
      description: "Optimizing, compressing and generating checksum",
    },
    Complete: {
      title: "Done",
      description: "Your merged document is ready to download",
    },
  };

  const [stageIndex, setStageIndex] = useState(0);
  const currentStage = stages[stageIndex];

  const workflowStages = useMemo(
    () => [
      {
        key: "preparing" as const,
        label: "Queueing Files",
        caption: "Validating file integrity",
        icon: Server,
      },
      {
        key: "merging" as const,
        label: "Processing",
        caption: "Combining content streams",
        icon: LineChart,
      },
      {
        key: "finalizing" as const,
        label: "Packaging",
        caption: "Preparing download bundle",
        icon: Package,
      },
    ],
    []
  );

  const stageNarratives: Record<"preparing" | "merging" | "finalizing" | "complete", { headline: string; subline: string }> = {
    preparing: {
      headline: "Preparing assets for merge...",
      subline: "Analyzing file structure, verifying metadata, and readying the pipeline.",
    },
    merging: {
      headline: "Processing files in real time...",
      subline: "Streaming documents through converters and merging content layers.",
    },
    finalizing: {
      headline: "Finalizing output package...",
      subline: "Optimizing assets, generating checksum, and sealing the document.",
    },
    complete: {
      headline: "Merge completed successfully!",
      subline: "Your file is ready to download with all requested changes applied.",
    },
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"] as const;
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const totalBytes = useMemo(() => files.reduce((acc, file) => acc + (file.size || 0), 0), [files]);

  const detectedStreams = useMemo(() => {
    const set = new Set<string>();
    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext) set.add(ext);
    });
    return Array.from(set);
  }, [files]);

  const brandedDocumentName = useMemo(() => getBrandedDocumentBase(documentName), [documentName]);

  const stageLogs = useMemo(() => {
    const activeFile = files[currentFileIndex];
    const baseLogs = {
      preparing: [
        `Allocating ${files.length} input stream${files.length === 1 ? "" : "s"}`,
        detectedStreams.length
          ? `Detected formats: ${detectedStreams.join(", ").toUpperCase()}`
          : "Awaiting file metadata",
        `Memory reservation: ${formatBytes(totalBytes)}`,
      ],
      merging: [
        activeFile
          ? `Merging ${activeFile.name}`
          : "Merging buffered stream",
        "Normalizing page order and vector data",
        "Writing incremental output segments",
      ],
      finalizing: [
        "Compressing and optimizing assets",
        "Generating cryptographic checksum",
        "Preparing secure download package",
      ],
      complete: [
        "Merge pipeline finished without errors",
        "Checksum validated and signed",
        "Download ready for delivery",
      ],
    } as const;
    return baseLogs[stage];
  }, [currentFileIndex, detectedStreams, files, stage, totalBytes]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = springProgress.on("change", (value) => {
      progressRef.current = value;
      setDisplayProgress(value);
    });

    return () => {
      unsubscribe();
    };
  }, [springProgress]);

  useEffect(() => {
    if (!isActive) {
      setStage("preparing");
      progressRef.current = 0;
      springProgress.set(0);
      setDisplayProgress(0);
      setCurrentFileIndex(0);
      setPipelineProgress([0, 0, 0]);
      return;
    }

    let animationFrame = 0;
    const stageDurations = [800, Math.max(1500, files.length * 300), 1000, 400];

    const advanceStage = (index: number) => {
      const targetStage = stages[index];
      setStageIndex(index);
      const start = progressRef.current;
      const end = progressTargets[targetStage];
      const duration = stageDurations[index];
      const easing = (t: number) => 1 - Math.pow(1 - t, 2);

      const step = (startTime: number, now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easing(t);
        const nextProgress = start + (end - start) * eased;
        springProgress.set(nextProgress);
        if (t < 1) {
          animationFrame = requestAnimationFrame((timestamp) => step(startTime, timestamp));
        } else if (index + 1 < stages.length) {
          advanceStage(index + 1);
        } else {
          setTimeout(() => onComplete(), 600);
        }
      };

      animationFrame = requestAnimationFrame((timestamp) => step(timestamp, timestamp));
    };

    advanceStage(0);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [files.length, isActive, onComplete, springProgress, stages]);

  const infoPoints = useMemo(() => {
    const base = [
      `${files.length} file${files.length === 1 ? "" : "s"} queued`,
      `${(totalBytes / 1024).toFixed(1)} KB total size`,
      `${detectedStreams.length || 1} format${detectedStreams.length === 1 ? "" : "s"} detected`,
    ];
    if (currentStage === "Finalizing" || currentStage === "Complete") {
      base.push("Checksum generated");
    }
    return base;
  }, [currentStage, detectedStreams.length, files.length, totalBytes]);

  const StageIcon = useMemo(() => {
    switch (currentStage) {
      case "Preflight":
        return Server;
      case "Processing":
        return LineChart;
      case "Finalizing":
        return Package;
      case "Complete":
      default:
        return CheckCircle;
    }
  }, [currentStage]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconProps = { className: "w-6 h-6" };
    
    switch (extension) {
      case 'pdf':
        return <FileText {...iconProps} className="w-6 h-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText {...iconProps} className="w-6 h-6 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet {...iconProps} className="w-6 h-6 text-green-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation {...iconProps} className="w-6 h-6 text-orange-500" />;
      case 'txt':
        return <FileText {...iconProps} className="w-6 h-6 text-gray-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image {...iconProps} className="w-6 h-6 text-purple-500" />;
      default:
        return <File {...iconProps} />;
    }
  };

  const getOutputIcon = () => {
    const iconProps = { className: "w-12 h-12" };
    
    switch (outputFormat.toLowerCase()) {
      case 'pdf':
        return <FileText {...iconProps} className="w-12 h-12 text-red-500" />;
      case 'docx':
        return <FileText {...iconProps} className="w-12 h-12 text-blue-500" />;
      case 'txt':
        return <FileText {...iconProps} className="w-12 h-12 text-gray-500" />;
      default:
        return <File {...iconProps} />;
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm"
    >
      <Card className="w-full max-w-2xl rounded-2xl border border-white/10 bg-background/95 shadow-xl">
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2">
                <StageIcon className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-widest text-muted-foreground">{currentStage}</p>
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                  {stageSummaries[currentStage].title}
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {stageSummaries[currentStage].description}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-muted/40 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Files in queue
              </p>
              <ul className="space-y-2">
                {files.slice(0, 3).map((file) => (
                  <li key={file.id} className="flex items-center justify-between text-sm text-foreground/90">
                    <span className="flex items-center gap-2">
                      {getFileIcon(file.name)}
                      <span className="truncate max-w-[12rem] sm:max-w-[10rem]">{file.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
              {files.length > 3 && (
                <p className="text-xs text-muted-foreground">+ {files.length - 3} more</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-muted/40 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Output details
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {brandedDocumentName}.{outputFormat}
                </p>
                <p className="text-xs text-muted-foreground">Branded export name</p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {infoPoints.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Progress</span>
              <span className="font-mono text-sm text-primary">{Math.round(displayProgress)}%</span>
            </div>
            <Progress value={displayProgress} className="h-2" />
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-4">
            <span className="text-xs text-muted-foreground">
              Please keep this window open while we finish your merge.
            </span>
            {currentStage === "Complete" && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                onClick={onComplete}
              >
                <Download className="h-4 w-4" />
                Download package
              </button>
            )}
          </footer>
        </div>
      </Card>
    </motion.div>
  );
};

export default MergeAnimation;