/**
 * Isolation Forest implementation in TypeScript for real-time anomaly detection.
 * Logic based on Liu, Ting, and Zhou (2008).
 */

interface Point {
  [key: string]: number;
}

class IsolationTree {
  private feature: string = '';
  private splitValue: number = 0;
  private left: IsolationTree | null = null;
  private right: IsolationTree | null = null;
  private size: number = 0;

  constructor(points: Point[], depth: number, maxDepth: number) {
    this.size = points.length;
    
    if (depth >= maxDepth || points.length <= 1) {
      return;
    }

    const features = Object.keys(points[0]);
    this.feature = features[Math.floor(Math.random() * features.length)];
    
    const values = points.map(p => p[this.feature]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) return;

    this.splitValue = min + Math.random() * (max - min);
    
    const leftPoints = points.filter(p => p[this.feature] < this.splitValue);
    const rightPoints = points.filter(p => p[this.feature] >= this.splitValue);
    
    if (leftPoints.length > 0 && rightPoints.length > 0) {
      this.left = new IsolationTree(leftPoints, depth + 1, maxDepth);
      this.right = new IsolationTree(rightPoints, depth + 1, maxDepth);
    }
  }

  public getPathLength(point: Point, currentDepth: number): number {
    if (this.left === null || this.right === null) {
      return currentDepth + this.c(this.size);
    }

    if (point[this.feature] < this.splitValue) {
      return this.left.getPathLength(point, currentDepth + 1);
    } else {
      return this.right.getPathLength(point, currentDepth + 1);
    }
  }

  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

export class IsolationForest {
  private trees: IsolationTree[] = [];
  private sampleSize: number;

  constructor(data: Point[], nTrees: number = 100, sampleSize: number = 256) {
    this.sampleSize = Math.min(sampleSize, data.length);
    const maxDepth = Math.ceil(Math.log2(this.sampleSize));

    for (let i = 0; i < nTrees; i++) {
      const sample = this.getSample(data, this.sampleSize);
      this.trees.push(new IsolationTree(sample, 0, maxDepth));
    }
  }

  public getAnomalyScore(point: Point): number {
    const avgPathLength = this.trees.reduce((acc, tree) => acc + tree.getPathLength(point, 0), 0) / this.trees.length;
    return Math.pow(2, -(avgPathLength / this.c(this.sampleSize)));
  }

  private getSample(data: Point[], n: number): Point[] {
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}
