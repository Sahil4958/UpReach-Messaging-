// const uploadContacts = async (req, res) => {
//   const { contacts } = req.body;
//   const userEmail = req.user?.email;

//   if (!userEmail) {
//     return res
//       .status(400)
//       .json({ message: "User email is missing from request." });
//   }

//   try {
//     const { rows } = await client.query(
//       "SELECT uploaded_contacts, contacts_limit, user_role FROM  users WHERE email = $1",
//       [userEmail]
//     );

//     if (!rows.length) {
//       return res
//         .status(404)
//         .json({ message: "User not found in the database." });
//     }

//     const user = rows[0];
//     const maxLimit = 10;
//     const availableSlots = maxLimit - user.uploaded_contacts;

//     console.log(
//       `Uploaded Contacts: ${user.uploaded_contacts}, Available Slots: ${availableSlots}, Contacts Being Uploaded: ${contacts.length}`
//     );
//     if (user.user_role === "Guest User") {
//       // const remainingLimit = user.contacts_limit - user.uploaded_contacts;
//       // console.log(`Remaining Limit: ${remainingLimit}, Contacts Being Uploaded: ${contacts.length}`);

//       if (user.uploaded_contacts >= maxLimit) {
//         return res.status(403).json({
//           message: `Upload limit exceeded. You cannot upload more contacts.`,
//         });
//       }

//       if (contacts.length > availableSlots) {
//         return res.status(403).json({
//           message: `You can only upload ${availableSlots} more contacts`,
//         });
//       }

//       await client.query(
//         "UPDATE users SET uploaded_contacts = LEAST(uploaded_contacts + $1, 10) WHERE email = $2",
//         [contacts.length, userEmail]
//       );
//     } else {
//       await client.query(
//         "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
//         [contacts.length, userEmail]
//       );
//     }
//     res.status(200).json({ message: "Contacts uploaded successfully." });
//   } catch (error) {
//     console.error("Database error:", error);
//     res
//       .status(500)
//       .json({ message: "An error occurred while uploading contacts." });
//   }
// };

/////////////////////////////

// const uploadContacts = async (req, res) => {
//   console.log("Upload contacts request received");

//   try {
//     const userEmail = req.user?.email;
//     const { contacts } = req.body;

//     if (!userEmail) {
//       return res
//         .status(400)
//         .json({ message: "User email is missing from the request." });
//     }

//     if (!Array.isArray(contacts) || contacts.length === 0) {
//       return res.status(400).json({ message: "Contacts array is required." });
//     }

//     // Fetch user details (uploaded_contacts, user_role)
//     const userQuery =
//       "SELECT uploaded_contacts, user_role FROM users WHERE email = $1";
//     const userResult = await client.query(userQuery, [userEmail]);

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ message: "User not found in the database." });
//     }

//     const { uploaded_contacts: uploadedContacts, user_role: userRole } =
//       userResult.rows[0];

//     const maxLimit = 10;
//     const availableSlots = maxLimit - uploadedContacts;

//     console.log(
//       `Uploaded Contacts: ${uploadedContacts}, Available Slots: ${availableSlots}, Contacts Being Uploaded: ${contacts.length}`
//     );

//     // If Guest User & No slots left, return error message
//     if (userRole === "Guest User" && availableSlots <= 0) {
//       return res.status(403).json({
//         message: "Upload limit exceeded. You cannot upload more contacts.",
//       });
//     }

//     // Limit contacts to available slots for Guest User
//     const contactsToUpload =
//       userRole === "Guest User" ? contacts.slice(0, availableSlots) : contacts;

//     console.log("✅ Contacts to Upload:", contactsToUpload.length);

//     // Update uploaded_contacts count in users table
//     await client.query(
//       "UPDATE users SET uploaded_contacts = LEAST(uploaded_contacts + $1, 10) WHERE email = $2",
//       [contactsToUpload.length, userEmail]
//     );

//     // If Guest User & added contacts are limited, show available slots message
//     if (userRole === "Guest User" && contacts.length > availableSlots) {
//       return res.status(403).json({
//         message: `You can only upload ${availableSlots} more contacts.`,
//       });
//     }

//     return res.status(200).json({
//       message: "Contacts uploaded successfully.",
//       uploadedContacts: uploadedContacts + contactsToUpload.length,
//     });
//   } catch (error) {
//     console.error("❌ Error uploading contacts:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while uploading contacts." });
//   }
// };
