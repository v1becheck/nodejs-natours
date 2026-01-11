class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // BUILD QUERY
    // 1a. Filtering
    const queryObj = { ...this.queryString }; // hard copy
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1b. Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
    //let query = Tour.find(JSON.parse(queryStr));
  }

  sort() {
    // 2. Sorting
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt _id');
    }

    return this;
  }

  limitFields() {
    // 3. Field Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    // 4. Pagination
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 20; // Reduced default from 100 to 20 for better performance
    const skip = (page - 1) * limit;

    // Prevent excessive pagination
    const maxLimit = 100;
    const finalLimit = limit > maxLimit ? maxLimit : limit;

    this.query = this.query.skip(skip).limit(finalLimit);

    return this;
  }
}

module.exports = APIFeatures;
