define(["esri/layers/GraphicsLayer", "esri/tasks/QueryTask", "esri/tasks/support/Query"], function(GraphicsLayer, QueryTask, Query) {
  // Private members
  // Set up statistics definition for client-side query
  //This is for the attribute query
  var popupTemplate = {
    // autocasts as new PopupTemplate()
    "title": "{Hospital}, {City_Town}",
    fieldInfos: [
      {
        fieldName: "Hosp_beds",
        label: "Bed Count",
        format: {
          places: 0,
          digitSeperator: true
        }
      },
      {
        fieldName: "Occupency",
        label: "Beds Occupied",
        format: {
          places: 0,
          digitSeperator: true
        }
      }
    ]
  };

  var hospSymbol = {
    type: "simple-marker", // autocasts as new 2D Point symbol
    symbolLayers: [
      {
        type: "point", // autocasts as new point symbol
        resource: {
          primitive: "point"
        }
      }
    ]
  };

  // Called each time the promise is rejected
  function promiseRejected(error) {
    console.error("Promise rejected: ", error.message);
  }

  //This is for the specific Query on the fly 
  const statDefinitions = ["Hosp_beds", "Occupency"].map(function(fieldName) {
    return {
      onStatisticField: fieldName,
      outStatisticFieldName: fieldName + "_TOTAL",
      statisticType: "sum"
    };
  });

  var resultsLayer = new GraphicsLayer();

  // Public (exported) members
  return {
    //Spatial query for hospital feature layer view for statistics
    queryLayerViewAgeStats(featureLayerView, buffer) {
      // Data storage for the chart
      let Hosp_beds = [],
        Occupency = [];

      // Client-side spatial query:
      // Get the total bed count and beds occupied for the hospitals
      const query = featureLayerView.layer.createQuery();
      query.outStatistics = statDefinitions;
      query.geometry = buffer;

      // Query the features on the client using FeatureLayerView.queryFeatures
      return featureLayerView
        .queryFeatures(query)
        .then(function(results) {
          // Statistics query returns a feature with 'stats' as attributes
          const attributes = results.features[0].attributes;

          // Loop through attributes and save the values for use in the chart.
          for (var key in attributes) {
            if (key.includes("Hosp")) {
              Hosp_beds.push(attributes[key]);
            } else {
              Occupency.push(-Math.abs(attributes[key]));
            }
          }

          return [Hosp_beds, Occupency];
        })
        .catch(function(error) {
          console.log(error);
        });
    },

    resultsLayer: resultsLayer,

    executeSpecificQuery(view) {
      var qTask = new QueryTask({
        url:
          "https://services.arcgis.com/o6oETlrWetREI1A2/arcgis/rest/services/Hospital_LL/FeatureServer/0",
        outFields: ["*"]
      });
    
      var params = new Query({
        returnGeometry: true,
        outFields: ["*"]
      });
    
      var attributeName = document.getElementById("attSelect");
      var expressionSign = document.getElementById("signSelect");
      var value = document.getElementById("valSelect");
    
      // Executes each time the button is clicked
      function doQuery() {
        // Clear the results from a previous query
        resultsLayer.removeAll();
      
        params.where =
            attributeName.value + expressionSign.value + value.value;
      
          // executes the query and calls getResults() once the promise is resolved
          // promiseRejected() is called if the promise is rejected
          qTask
            .execute(params)
            .then(getResults)
            .catch(promiseRejected);
      }
      
      // Called each time the promise is resolved
      function getResults(response) {
        console.log("response", response);
        // Loop through each of the results and assign a symbol and PopupTemplate
        // to each so they may be visualized on the map
        var hospResults = response.features.map(function(feature) {
          feature.symbol = {
            type: "simple-marker",
            style: "circle",
            color: "blue",
            size: "8px", // pixels
            outline: {
              color: [124, 11, 11],
              width: 2 // points
            }
          };
          feature.popupTemplate = popupTemplate;
          return feature;
        });
    
        resultsLayer.addMany(hospResults);

        console.log("GOTO")
    
        // animate to the results after they are added to the map
        view.goTo(hospResults).then(function() {
          view.popup.open({
            features: hospResults,
            featureMenuOpen: true,
            updateLocationEnabled: true
          });
        });
    
        // print the number of results returned to the user
        document.getElementById("printResults").innerHTML =
          hospResults.length + " results found!";
      }

      doQuery();
    }
  };
});
