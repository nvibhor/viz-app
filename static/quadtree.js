function Point(x, y) {
  this.x = x;
  this.y = y;
}


function Rect(p1, p2) {
  this.lo = new Point(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
  this.hi = new Point(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
};


Rect.prototype.contains = function(x, y) {
  if (x < this.lo.x) return false;
  if (y < this.lo.y) return false;
  if (x > this.hi.x) return false;
  if (y > this.hi.y) return false;

  return true;
};


Rect.prototype.containedBy = function(lo, hi) {
  if (this.lo.x < lo.x) return false;
  if (this.lo.y < lo.y) return false;
  if (this.hi.x > hi.x) return false;
  if (this.hi.y > hi.y) return false;

  return true;
};


function QuadTree(lo, hi) {
  this.root_ = new Node(lo, hi, 0);
}

QuadTree.prototype.insert = function(x, y, data) {
  this.root_.insert(x, y, data);
};


QuadTree.prototype.query = function(rect) {
  // Start the search at the root.
  return this.queryNode(this.root_, rect);
};

QuadTree.prototype.queryNode = function(node, rect) {
  if (!node) return [];

  var list = [];
  if (node.isLeaf()) {
    if (node.dataPoints.length <= 0) return list;

    // Either the rect contains the leaf's center or the leaf completely
    // contains the query rect. In either case, we need to check if any data
    // points are contained by the query rect.
    if (rect.contains(node.x, node.y) ||
        rect.containedBy(node.lo, node.hi)) {
    // add the point-data that is contained by rect to the return list.
      node.dataPoints.forEach(function(dataPoint) {
        if (rect.contains(dataPoint.x, dataPoint.y)) {
          list.push(dataPoint);
        }
      });
    }
    return list;
  }

  if (rect.lo.x < node.x && rect.lo.y < node.y) {
    list = list.concat(this.queryNode(node._00(), rect));
  }
  if (rect.lo.x < node.x && rect.hi.y >= node.y) {
    list = list.concat(this.queryNode(node._10(), rect));
  }
  if (rect.hi.x >= node.x && rect.lo.y < node.y) {
    list = list.concat(this.queryNode(node._01(), rect));
  }
  if (rect.hi.x >= node.x && rect.hi.y >= node.y) {
    list = list.concat(this.queryNode(node._11(), rect));
  }

  return list;
};

function Node(lo, hi, level, opt_parentNode) {
  this.x = lo.x + (hi.x - lo.x) / 2;
  this.y = lo.y + (hi.y - lo.y) / 2;
  this.lo = lo;
  this.hi = hi;
  this.children_ = [];
  this.dataPoints = [];
  this.level = level;
  if (_DEBUG) {
    this.debugInfo = {
      totalContained: 0,
      parentNode: opt_parentNode || null
    };
  }
}

// Constants
Node.MAX_LEVELS = 20;
// If the number of data points at a leaf at level 20 goes beyond
// MAX_DATA_POINTS, we DO NOT subdivide the node further.
Node.MAX_DATA_POINTS = 10;

Node.prototype.isLeaf = function() {
  return !this.children_.length;
};


Node.prototype._00 = function() {
  return this.children_.length ? this.children_[0] : null;
};


Node.prototype._01 = function() {
  return this.children_.length ? this.children_[1] : null;
};


Node.prototype._10 = function() {
  return this.children_.length ? this.children_[2] : null;
};


Node.prototype._11 = function() {
  return this.children_.length ? this.children_[3] : null;
};


Node.prototype.divide_ = function() {
  if (!this.isLeaf()) {
    throw new Exception("Trying to divide an existing non-leaf node.");
  }

  var center = new Point(this.x, this.y);
  var newLevel = this.level + 1;
  this.children_ = [
    new Node(this.lo, center, newLevel, this),
    new Node(new Point(center.x, this.lo.y), new Point(this.hi.x, center.y), newLevel, this),
    new Node(new Point(this.lo.x, center.y), new Point(center.x, this.hi.y), newLevel, this),
    new Node(center, this.hi, newLevel, this)
  ];

  // Now it is a non-leaf node, so redistribute the data spatially in the sub-nodes.
  if (!!this.debugInfo) {
    this.debugInfo.totalContained = 0;
  }
  for (var i in this.dataPoints) {
    this.insert_(this.dataPoints[i]);
  }

  this.dataPoints.length = 0;
};


Node.prototype.insert_ = function(dataPoint) {
  this.insert(dataPoint.x, dataPoint.y, dataPoint.data);
};


Node.prototype.notDividable_ = function() {
  return (this.level == Node.MAX_LEVELS);
};


Node.prototype.insert = function(x, y, data) {
  if (!!this.debugInfo) {
    this.debugInfo.totalContained++;
  }

  if (this.isLeaf() &&
      (this.dataPoints.length + 1 <= Node.MAX_DATA_POINTS ||
       this.notDividable_())) {
    this.dataPoints.push({x: x, y: y, data: data});
    return;
  }

  if (this.isLeaf()) this.divide_();
  var childNode;
  if (x < this.x && y < this.y) {
    childNode = this._00();
  } else if (x >= this.x && y < this.y) {
    childNode = this._01();
  } else if (x < this.x && y >= this.y) {
    childNode = this._10();
  } else {
    childNode = this._11();
  }

  childNode.insert(x, y, data);
};
