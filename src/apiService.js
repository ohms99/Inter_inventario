// const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

export async function getLiquorBottleDefinitions() {
//   try {
//     const response = await fetch(`${STRAPI_URL}/api/liquor-bottle-definitions`);
//     if (!response.ok) {
//       throw new Error(`Strapi API Error: ${response.status} ${response.statusText}`);
//     }
//     const data = await response.json();
    
//     // Strapi typically wraps data in a 'data' attribute, and items have 'attributes'
//     // We need to transform this into the flat structure currently used by allBottleData
//     // e.g., { tequila: { patron: { label: 'Patron', ... } } }
//     const formattedData = {};
//     if (data && data.data) {
//       data.data.forEach(item => {
//         const attributes = item.attributes;
//         if (attributes && attributes.type && attributes.unique_key) {
//           const type = attributes.type.toLowerCase();
//           const key = attributes.unique_key; // Assuming unique_key is like "patron_silver"
          
//           if (!formattedData[type]) {
//             formattedData[type] = {};
//           }
//           formattedData[type][key] = {
//             label: attributes.name,
//             volume: attributes.volume_ml,
//             emptyWeight: attributes.empty_weight_g,
//             fullWeight: attributes.full_weight_g,
//             // Add any other fields you need from Strapi if they differ from current structure
//           };
//         }
//       });
//     }
//     return formattedData;
//   } catch (error) {
//     console.error("Failed to fetch liquor bottle definitions:", error);
//     // In a real app, you might want to throw the error or return a specific error object
//     return {}; // Return empty object or handle error as appropriate
//   }
}

// We will add more functions here later for:
// - Adding a new liquor bottle definition
// - Fetching/Saving inventory sessions
// - User authentication
// - Beer catalog and inventory 