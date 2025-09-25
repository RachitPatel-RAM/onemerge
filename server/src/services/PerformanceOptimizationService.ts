import os from 'os';
import cluster from 'cluster';
import { Worker } from 'worker_threads';
import path from 'path';

export interface PerformanceConfig {
  maxConcurrentOperations: number;
  memoryThreshold: number; // in MB
  cpuThreshold: number; // percentage
  enableParallelProcessing: boolean;
  enableMemoryOptimization: boolean;
  enableResourceMonitoring: boolean;
  batchSize: number;
  workerPoolSize: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  activeOperations: number;
  queuedOperations: number;
  averageProcessingTime: number;
}

export interface PerformanceResult<T> {
  result: T;
  metrics: {
    processingTime: number;
    memoryUsed: number;
    cpuTime: number;
    parallelOperations: number;
  };
}

export class PerformanceOptimizationService {
  private config: PerformanceConfig;
  private activeOperations: Set<string> = new Set();
  private operationQueue: Array<() => Promise<any>> = [];
  private processingTimes: number[] = [];
  private memorySnapshots: number[] = [];
  private isProcessingQueue = false;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      maxConcurrentOperations: Math.max(2, Math.floor(os.cpus().length * 0.8)),
      memoryThreshold: 1024, // 1GB
      cpuThreshold: 80,
      enableParallelProcessing: true,
      enableMemoryOptimization: true,
      enableResourceMonitoring: true,
      batchSize: 4,
      workerPoolSize: Math.max(2, Math.floor(os.cpus().length / 2)),
      ...config
    };

    console.log(`[PerformanceService] Initialized with config:`, this.config);
    
    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }

  /**
   * Execute operations with performance optimizations
   */
  async executeOptimized<T>(
    operations: Array<() => Promise<T>>,
    operationName: string = 'batch'
  ): Promise<PerformanceResult<T[]>> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const operationId = `${operationName}_${Date.now()}`;

    console.log(`[PerformanceService] Starting optimized execution of ${operations.length} operations`);

    try {
      this.activeOperations.add(operationId);

      let results: T[];

      if (this.config.enableParallelProcessing && operations.length > 1) {
        results = await this.executeParallel(operations);
      } else {
        results = await this.executeSequential(operations);
      }

      const processingTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Update performance metrics
      this.processingTimes.push(processingTime);
      this.memorySnapshots.push(memoryUsed);

      // Keep only recent metrics (last 100 operations)
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-100);
        this.memorySnapshots = this.memorySnapshots.slice(-100);
      }

      console.log(`[PerformanceService] Completed ${operations.length} operations in ${processingTime}ms`);

      return {
        result: results,
        metrics: {
          processingTime,
          memoryUsed,
          cpuTime: processingTime, // Simplified CPU time
          parallelOperations: this.config.enableParallelProcessing ? 
            Math.min(operations.length, this.config.maxConcurrentOperations) : 1
        }
      };

    } finally {
      this.activeOperations.delete(operationId);
      
      // Trigger garbage collection if memory usage is high
      if (this.config.enableMemoryOptimization) {
        await this.optimizeMemory();
      }
    }
  }

  /**
   * Execute operations in parallel with controlled concurrency
   */
  private async executeParallel<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    const batchSize = Math.min(this.config.batchSize, this.config.maxConcurrentOperations);

    console.log(`[PerformanceService] Executing ${operations.length} operations in parallel (batch size: ${batchSize})`);

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      // Check resource constraints before processing batch
      if (await this.shouldThrottleOperations()) {
        console.log(`[PerformanceService] Throttling operations due to resource constraints`);
        await this.waitForResourceAvailability();
      }

      const batchResults = await Promise.all(
        batch.map(async (operation, index) => {
          try {
            return await operation();
          } catch (error) {
            console.error(`[PerformanceService] Operation ${i + index} failed:`, error);
            throw error;
          }
        })
      );

      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  /**
   * Execute operations sequentially
   */
  private async executeSequential<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    console.log(`[PerformanceService] Executing ${operations.length} operations sequentially`);
    
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result);
      } catch (error) {
        console.error(`[PerformanceService] Sequential operation ${i} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Check if operations should be throttled based on resource usage
   */
  private async shouldThrottleOperations(): Promise<boolean> {
    const metrics = await this.getResourceMetrics();
    
    return (
      metrics.memoryUsage.percentage > this.config.memoryThreshold / 1024 * 100 ||
      metrics.cpuUsage > this.config.cpuThreshold ||
      this.activeOperations.size >= this.config.maxConcurrentOperations
    );
  }

  /**
   * Wait for resource availability
   */
  private async waitForResourceAvailability(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waitTime = 0;

    while (waitTime < maxWaitTime) {
      if (!(await this.shouldThrottleOperations())) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    console.warn(`[PerformanceService] Resource availability timeout after ${maxWaitTime}ms`);
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemory(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    if (memoryUsedMB > this.config.memoryThreshold) {
      console.log(`[PerformanceService] Memory usage high (${memoryUsedMB.toFixed(2)}MB), triggering optimization`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log(`[PerformanceService] Garbage collection triggered`);
      }

      // Clear old metrics
      if (this.processingTimes.length > 50) {
        this.processingTimes = this.processingTimes.slice(-50);
        this.memorySnapshots = this.memorySnapshots.slice(-50);
      }
    }
  }

  /**
   * Get current resource metrics
   */
  async getResourceMetrics(): Promise<ResourceMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Simple CPU usage estimation (not perfectly accurate but sufficient)
    const cpuUsage = await this.getCPUUsage();

    const averageProcessingTime = this.processingTimes.length > 0 ?
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length : 0;

    return {
      cpuUsage,
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length,
      averageProcessingTime
    };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();
        
        const userCPU = endUsage.user / 1000; // Convert to milliseconds
        const systemCPU = endUsage.system / 1000;
        const totalCPU = userCPU + systemCPU;
        const totalTime = endTime - startTime;
        
        const cpuPercentage = (totalCPU / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercentage)));
      }, 100);
    });
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(async () => {
      const metrics = await this.getResourceMetrics();
      
      if (metrics.memoryUsage.percentage > 90) {
        console.warn(`[PerformanceService] High memory usage: ${metrics.memoryUsage.percentage.toFixed(2)}%`);
      }
      
      if (metrics.cpuUsage > 90) {
        console.warn(`[PerformanceService] High CPU usage: ${metrics.cpuUsage.toFixed(2)}%`);
      }
      
      if (metrics.activeOperations > this.config.maxConcurrentOperations * 0.8) {
        console.warn(`[PerformanceService] High operation load: ${metrics.activeOperations} active operations`);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Create a worker pool for CPU-intensive tasks
   */
  async createWorkerPool<T>(
    workerScript: string,
    tasks: any[],
    workerData?: any
  ): Promise<T[]> {
    if (!this.config.enableParallelProcessing) {
      throw new Error('Parallel processing is disabled');
    }

    const results: T[] = [];
    const workers: Worker[] = [];
    const taskQueue = [...tasks];
    
    console.log(`[PerformanceService] Creating worker pool with ${this.config.workerPoolSize} workers for ${tasks.length} tasks`);

    return new Promise((resolve, reject) => {
      let completedTasks = 0;
      let hasError = false;

      // Create workers
      for (let i = 0; i < Math.min(this.config.workerPoolSize, tasks.length); i++) {
        const worker = new Worker(workerScript, { workerData });
        workers.push(worker);

        worker.on('message', (result: T) => {
          if (hasError) return;
          
          results.push(result);
          completedTasks++;

          // Assign next task if available
          if (taskQueue.length > 0) {
            const nextTask = taskQueue.shift();
            worker.postMessage(nextTask);
          } else {
            worker.terminate();
          }

          // Check if all tasks completed
          if (completedTasks === tasks.length) {
            workers.forEach(w => w.terminate());
            resolve(results);
          }
        });

        worker.on('error', (error) => {
          if (hasError) return;
          hasError = true;
          
          workers.forEach(w => w.terminate());
          reject(error);
        });

        // Assign initial task
        if (taskQueue.length > 0) {
          const task = taskQueue.shift();
          worker.postMessage(task);
        }
      }
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const avgProcessingTime = this.processingTimes.length > 0 ?
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length : 0;

    const avgMemoryUsage = this.memorySnapshots.length > 0 ?
      this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length : 0;

    return {
      configuration: this.config,
      statistics: {
        totalOperations: this.processingTimes.length,
        averageProcessingTime: Math.round(avgProcessingTime),
        averageMemoryUsage: Math.round(avgMemoryUsage / 1024 / 1024), // MB
        activeOperations: this.activeOperations.size,
        queuedOperations: this.operationQueue.length
      },
      systemInfo: {
        cpuCores: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Update performance configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[PerformanceService] Configuration updated:`, this.config);
  }
}