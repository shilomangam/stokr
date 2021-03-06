(function (Stokr) {
  'use strict';

  class Cntl {
    constructor() {
      this.model = new Stokr.Model();
      this.view = new Stokr.View();
      this._init();
    }

    _getStock() {
      const myStocks = this.model.getState().myStocks;
      return new Promise((resolve, reject) => {
        fetch(`${ENDPOINTS.QUOTES}${myStocks.toString()}`)
          .then((res) => res.json())
          .then(data => {
            resolve(data.query.results.quote);
          })
          .catch(err => {
            reject(err);
          })
      })

    }

    setFilterData(data) {
      this._setAppFilters(data);
      this.view.render(this._generateDataForRender());
    }

    _setAppFilters(data) {
      const currentState = this.model.getState();
      currentState.uiState.filters = data;
    }

    _setStocksInModel(data) {
      const appState = this.model.getState();
      appState.stocks = data;
    }

    _init() {
      const hash = this.view._getHash();
      if (hash) {
        this._changeViewInModel(hash);
      }
      this._getStock()
        .then((data) => {
          this._setStocksInModel(data);
          this.view.render(this._generateDataForRender());
        })
        .catch(err => {
          console.error(err);
        })

    }

    _filterData() {
      const appState = this.model.getState(),
        filters = appState.uiState.filters,
        stocks = appState.stocks;
      if (Object.keys(filters).length !== 0) {
        const filteredStocks = stocks.filter(stock => {
          const stockPrice = parseFloat(stock.Open);
          if (stock.Name.indexOf(filters.stockName) !== -1 || stock.Symbol.indexOf(filters.stockName) === -1)
            return false;
          if (filters.gain === 'gaining') {
            if (stock.Change[0] === '-') {
              return false;
            }
          }
          if (filters.gain === 'losing') {
            if (stock.Change[0] !== '-') {
              return false;
            }
          }
          if (filters.rangeFrom) {
            const rangeFrom = parseFloat(filters.rangeFrom);
            if (rangeFrom > stockPrice)
              return false;
          }
          if (filters.rangeTo) {
            const rangeTo = parseFloat(filters.rangeTo);
            if (stockPrice > rangeTo)
              return false;
          }
          return true;
        });
        return filteredStocks;
      } else {
        return stocks;
      }
    }

    _generateDataForRender() {
      const stocks = this._filterData();
      return {stocks, uiState: this.model.getState().uiState};
    }

    changePresentValue() {
      const currentState = this.model.getState();
      const currentPresentState = currentState.uiState.displayVal;
      const currentIndex = DISPLAY_ARRAY.indexOf(currentPresentState);
      currentState.uiState.displayVal = DISPLAY_ARRAY[(currentIndex + 1) % DISPLAY_ARRAY.length];
      this.view.render(this._generateDataForRender());
    }

    reorderStockList(stockSymbol, direction) {
      const currentState = this.model.getState();
      const stockIndex = currentState.stocks.findIndex((item) => item.Symbol === stockSymbol);
      this._swapElements(currentState.stocks, stockIndex, direction === 'up' ? stockIndex - 1 : stockIndex + 1);
      this.view.render(this._generateDataForRender());
    }

    toggleFilterBar() {
      const currentState = this.model.getState();
      if (currentState.uiState.showFilterBar) {
        this._removeFilters();
      }
      currentState.uiState.showFilterBar = !currentState.uiState.showFilterBar;
      this.view.render(this._generateDataForRender());
    }

    _removeFilters() {
      const uiState = this.model.getState();
      uiState.uiState.filters = {};
    }

    _swapElements(arr, firstIndex, secondIndex) {
      let tmp = arr[firstIndex];
      arr[firstIndex] = arr[secondIndex];
      arr[secondIndex] = tmp;
    }

    changeView(hash) {
      this._changeViewInModel(hash);
      this.view.render(this._generateDataForRender());
    }

    _changeViewInModel(hash) {
      const capHash = hash.toUpperCase();
      const currentState = this.model.getState();
      hash === VIEWS.SEARCH ? this._initSearchState() : this._resetSearchState();
      VIEWS[capHash] ? currentState.uiState.view = VIEWS[capHash] : currentState.uiState.view = VIEWS.GENERAL;
    }

    _initSearchState() {
      const currentState = this.model.getState(),
        searchState = currentState.uiState.search;
      searchState.status = SEARCH.SEARCH_STATUS.INIT;
    }

    _resetSearchState() {
      const currentState = this.model.getState();
      currentState.uiState.search = {};
    }

    _searchStockOnServer(val) {
      return new Promise((resolve, reject) => {
        fetch(`${ENDPOINTS.SEARCH}${val}`)
          .then(res => res.json())
          .then(data => {
            resolve(data.ResultSet.Result);
          })
          .catch(err => {
            reject(err);
          })
      });

    }

    search(val) {
      this._searchStockOnServer(val)
        .then(data => {
          const currentState = this.model.getState();
          if (data.length > 0) {
            currentState.uiState.search.searchResults = data;
            currentState.uiState.search.status = SEARCH.SEARCH_STATUS.FOUND;
          } else {
            currentState.uiState.search.status = SEARCH.SEARCH_STATUS.NO_RESULTS;
          }
          currentState.uiState.search.searchTerm = val;
          this.view.render({stocks: [], uiState: this.model.getState().uiState});
        })
        .catch(err => {
          console.log(err.message);
        });
    }

    refreshStockList() {
      this._getStock()
        .then(data => {
          this._setStocksInModel(data);
          this.view.render(this._generateDataForRender());
        })
        .catch(err => {
          console.error(err);
        });
    }

  }

  window.Stokr.Cntl = new Cntl();

}(window.Stokr = window.Stokr || {}));


