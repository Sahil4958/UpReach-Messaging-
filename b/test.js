const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = process.env.TEST_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

const sendTestMessage = async(count) =>{
    let startTime = Date.now();
    let sentMessages = 0;

    for( let i = 0; i<count; i++){
        try{
            await client.messages.create({
                body : `Test message ${i+1}`,
                from : fromNumber,
                to: toNumber,
            });
            sentMessages++;
        }catch (error) {
            console.error(`Error sending message ${i + 1}:`, error.message);
        }
    }

let endTime = Date.now();
let timeTakenSec = (endTime - startTime) /1000;
let smsPerSec = sentMessages/timeTakenSec;

console.log(`Sms per second: ${smsPerSec}`);
return smsPerSec < 10 ? 10 : smsPerSec;
}
sendTestMessage(20).then(result=> console.log(`Final SMS rate: ${result}`));



const contactUsedLimits = async (req, res) => {
    console.log("Fetching usage data for:", req.user.email ||  "No user email found");
    try {
      const { rows } = await client.query(
        `
        SELECT 
          uploaded_contacts, contacts_limit,
          sent_sms, sms_limit,
          trial_end_date
        FROM users 
        WHERE email = $1
      `,
        [req.user.email]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const usageData = rows[0];
      res.json({
        contacts_limit: usageData.contacts_limit,
        uploaded_contacts: usageData.uploaded_contacts,
        sms_limit: usageData.sms_limit,
        sent_sms: usageData.sent_sms,
        trial_end_date: usageData.trial_end_date,
      });
    } catch (error) {
      console.error("Usage fetch error:", error);
      res.status(500).json({ message: "Error fetching usage data" });
    }
  };

  const sendSms = async (req, res) => {
    const userEmail = req.user.email;
  
    try {
      const { rows } = await client.query(
        "SELECT sent_sms, sms_limit FROM users WHERE email = $1",
        [userEmail]
      );
      const user = rows[0];
  
      if (user.sent_sms >= user.sms_limit) {
        return res.status(403).json({
          message: "SMS sending limit reached. Upgrade to a paid plan.",
        });
      }
  
      //Increment the sent SMS counter
  
      await client.query(
        "UPDATE users SET sent_sms = sent_sms + 1 WHERE email = $1",
        [userEmail]
      );
      // Logic to send SMS (e.g., call Twilio API)
      res.json({ message: "SMS sent successfully." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "An error occurred while sending SMS." });
    }
  };
  



  //
  const uploadContacts = async (req, res) => {
    const { contacts } = req.body;
    const userEmail = req.user.email;
  
    try {
      const { rows } = await client.query(
        "SELECT uploaded_contacts, contacts_limit FROM users WHERE email = $1",
        [userEmail]
      );
      const user = rows[0];
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      if (user.user_role === "Guest User" && user.contacts_limit !== null) {
        const remainingLimit = user.contacts_limit - user.uploaded_contacts;
        console.log(`Remaining Limit: ${remainingLimit}, Contacts Being Uploaded: ${contacts.length}`);
       
        if (remainingLimit <= 0) {
          return res.status(403).json({
            message: `Upload limit exceeded. You cannot upload more contacts.`,
          });
        }
  
  
        if (contacts.length > remainingLimit) {
          return res.status(403).json({
            message: `Upload limit exceeded. You can upload up to ${remainingLimit} more contacts.`,
          });
        }
      }
      // Increment the uploaded contacts counter
      const { rows: updatedRows } = await client.query(
        "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
        [contacts.length, userEmail]
      );
  
          // Check again after updating to ensure no overcounting
          const updatedUser = updatedRows[0];
          if (updatedUser.uploaded_contacts > updatedUser.contacts_limit) {
            return res.status(403).json({
              message: `Contact upload limit reached. Upgrade to a paid plan.`,
            });
          }
      // Logic to upload contacts (e.g., save contacts to the database)
      res.status(200).json({ message: "Contacts uploaded successfully." });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while uploading contacts." });
    }
  };
  

   const uploadForm = async (req, res) => {
    try {
      const userEmail = req.user?.email
      const  {contacts}  = req.body;
  
     
      // Validate all contacts
      for (const contact of contacts) {
        const { name, title, countryCode, phone } = contact;
        if (!name || !title || !countryCode || !phone) {
          return res.status(400).json({ message: "All contact fields are required." });
        }
      }
  
      // Fetch the current uploaded_contacts count from users table
      const userQuery = "SELECT uploaded_contacts FROM users WHERE email = $1";
      const userResult = await client.query(userQuery, [userEmail]);
  
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }
  
      const uploadedContacts = userResult.rows[0].uploaded_contacts;
      const remainingLimit = 10 - uploadedContacts;
  
      if (remainingLimit <= 0) {
        return res.status(400).json({ message: "Limit reached: Max 10 contacts allowed for Guest user." });
      }
  
      if (contacts.length > remainingLimit) {
        return res.status(400).json({
          message: `You can only add ${remainingLimit} more contacts.`,
        });
      }
  
      // Update the uploaded_contacts count in users table
      await client.query(
        "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
        [contacts.length, userEmail]
      );
  
      return res.status(201).json({
        message: "Contacts processed successfully!",
        uploadedContacts: uploadedContacts + contacts.length,
      });
    } catch (error) {
      console.error("Error updating contact limit:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
   }

















//2
   const uploadContacts3 = async (req, res) => {
     const { contacts } = req.body;
     const userEmail = req.user?.email;
   
     if (!userEmail) {
       return res
         .status(400)
         .json({ message: "User email is missing from request." });
     }
   
     try {
       const { rows } = await client.query(
         "SELECT uploaded_contacts, contacts_limit FROM users WHERE email = $1",
         [userEmail]
       );
   
       if (!rows.length) {
         return res
           .status(404)
           .json({ message: "User not found in the database." });
       }
   
       const user = rows[0];
       let remainingLimit = user.contacts_limit - user.uploaded_contacts;
       console.log(
         `Remaining Limit: ${remainingLimit}, Contacts Being Uploaded: ${contacts.length}`
       );
       if (user.user_role === "Guest User" && user.contacts_limit !== null) {
         // const remainingLimit = user.contacts_limit - user.uploaded_contacts;
         // console.log(`Remaining Limit: ${remainingLimit}, Contacts Being Uploaded: ${contacts.length}`);
   
         if (remainingLimit <= 0) {
           return res.status(403).json({
             message: `Upload limit exceeded. You cannot upload more contacts.`,
           });
         }
   
         if (contacts.length > remainingLimit) {
           return res.status(403).json({
             message: `Upload limit exceeded. You can upload up to ${remainingLimit} more contacts.`,
           });
         }
       }
   
       const { rows: updatedRows } = await client.query(
         "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2 RETURNING uploaded_contacts, contacts_limit",
         [contacts.length, userEmail]
       );
   
       if (updatedRows[0].uploaded_contacts > updatedRows[0].contacts_limit) {
         return res.status(403).json({
           message: `Contact upload limit reached. Upgrade to a paid plan.`,
         });
       }
   
       res.status(200).json({ message: "Contacts uploaded successfully." });
     } catch (error) {
       console.error("Database error:", error);
       res
         .status(500)
         .json({ message: "An error occurred while uploading contacts." });
     }
   };
   
   
   //2
   const uploadForm3 = async (req, res) => {
     try {
       const userEmail = req.user?.email;
       const { contacts } = req.body;
   
       if (!userEmail) {
         return res.status(400).json({ message: "User email is required." });
       }
   
       if (!Array.isArray(contacts) || contacts.length === 0) {
         return res.status(400).json({ message: "Contacts array is required." });
       }
   
    
       for (const contact of contacts) {
         const { name, title, countryCode, phone } = contact;
         if (!name || !title || !countryCode || !phone) {
           return res.status(400).json({ message: "All contact fields are required." });
         }
       }
   
       // Fetch user details (uploaded_contacts & user_role)
       const userQuery = "SELECT uploaded_contacts, user_role FROM users WHERE email = $1";
       const userResult = await client.query(userQuery, [userEmail]);
   
       if (userResult.rows.length === 0) {
         return res.status(404).json({ message: "User not found." });
       }
   
       const { uploaded_contacts: uploadedContacts, user_role: userRole } = userResult.rows[0];
   
       // Apply contact limit **ONLY** for "Guest User"
       if (userRole === "Guest User") {
         const remainingLimit = 10 - uploadedContacts;
   
         if (remainingLimit <= 0) {
           return res.status(400).json({ message: "Limit reached: Max 10 contacts allowed for Guest users." });
         }
   
         if (contacts.length > remainingLimit) {
           return res.status(400).json({ message: `You can only add ${remainingLimit} more contacts.` });
         }
       }
   
       // Update uploaded_contacts count in users table
       await client.query(
         "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
         [contacts.length, userEmail]
       );
   
       return res.status(201).json({
         message: "Contacts processed successfully!",
         uploadedContacts: uploadedContacts + contacts.length,
       });
   
     } catch (error) {
       console.error("Error updating contact limit:", error);
       return res.status(500).json({ message: "Internal server error" });
     }
   };



   //latest
   const uploadForm4 = async (req, res) => {
     // console.log("Raw request body:", req.body); // Log full body
     // console.log("Contacts received:", req.body.contacts); // Log only contacts array
     console.log("Upload form req received");
   
     try {
       const userEmail = req.user?.email;
       const { contacts } = req.body;
   
       if (!userEmail) {
         return res.status(400).json({ message: "User email is required." });
       }
   
       if (!Array.isArray(contacts) || contacts.length === 0) {
         return res.status(400).json({ message: "Contacts array is required." });
       }
   
       // Format contacts to match database field names
       const formattedContacts = contacts.map((contact) => ({
         customer_name: contact.customer,
         name: contact.name,
         title: contact.title,
         country_code: contact.countryCode,
         phone: contact.phone,
       }));
       console.log("🔹 Transformed Contacts for Database:", formattedContacts);
   
       // Fetch user details (uploaded_contacts & user_role)
       const userQuery =
         "SELECT uploaded_contacts, user_role FROM users WHERE email = $1";
       const userResult = await client.query(userQuery, [userEmail]);
   
       if (userResult.rows.length === 0) {
         return res.status(404).json({ message: "User not found." });
       }
   
       const { uploaded_contacts: uploadedContacts, user_role: userRole } =
         userResult.rows[0];
   
       // Apply contact limit **ONLY** for "Guest User"
       if (userRole === "Guest User") {
         const maxLimit = 10;
         const availableSlots = maxLimit - uploadedContacts;
   
         if (availableSlots <= 0) {
           return res.status(400).json({
             message: "Limit reached: Max 10 contacts allowed for Guest users.",
           });
         }
   
         // Update uploaded_contacts count in users table
         console.log("contact", contacts.length);
   
         await client.query(
           "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
           [contacts.length, userEmail]
         );
   
         res.status(400).json({
           message: `You can only add ${availableSlots} more contacts.`,
         });
       } else {
         await client.query(
           "UPDATE users SET uploaded_contacts = uploaded_contacts + $1 WHERE email = $2",
           [contacts.length, userEmail]
         );
       }
   
       return res.status(201).json({
         message: "Contacts processed successfully!",
         uploadedContacts: uploadedContacts + contacts.length,
       });
     } catch (error) {
       console.error("Error updating contact limit:", error);
       return res.status(500).json({ message: "Internal server error" });
     }
   };
   

   //front end 

     // const [usage, setUsage] = useState({
  //   contacts: { used: 0, limit: 10 },
  // });

  // // useEffect(() => {
  // //   const fetchData = async () => {
  // //     try {
  // //       const userEmail = localStorage.getItem("userEmail");
  // //       if (!userEmail) {
  // //         setErrors(["Email is not available in localStorage!"]);
  // //         return;
  // //       }

  // //       // Fetch usage data
  // //       const usageResponse = await fetch(
  // //         `${config.apiBaseUrl}/api/upload-contact?email=${encodeURIComponent(
  // //           userEmail
  // //         )}`
  // //       );
  // //       const usageData = await usageResponse.json();

  // //       if (usageResponse.ok) {
  // //         setUsage({
  // //           contacts: {
  // //             used: usageData.uploaded_contacts,
  // //             limit: usageData.contacts_limit,
  // //           },
  // //         });
  // //       } else {
  // //         setErrors(["Failed to fetch usage data."]);
  // //       }
  // //     } catch (error) {
  // //       setErrors(["An error occurred while fetching usage data."]);
  // //     }
  // //   };

  // //   fetchData();
  // // }, []);

  // // Fetch customers from the backend
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const userEmail = localStorage.getItem("userEmail");
  //       console.log("Stored Email:", userEmail); // Debugging

  //       if (!userEmail) {
  //         setErrors(["Email is not available in localStorage!"]);
  //         return;
  //       }

  //       // Fetch usage data
  //       const usageResponse = await fetch(
  //         `${config.apiBaseUrl}/api/upload-contact?email=${encodeURIComponent(
  //           userEmail
  //         )}`,
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json",
  //             "User-Email": userEmail, // Send email in headers
  //             body: JSON.stringify({ email: userEmail })
  //           },
  //         }
  //       );

  //       const usageData = await usageResponse.json();
  //       console.log("API Response:", usageData);
  //       if (usageResponse.ok) {
  //         setUsage({
  //           contacts: {
  //             used: usageData.uploaded_contacts,
  //             limit: usageData.contacts_limit,
  //           },
  //         });
  //       } else {
  //         setErrors([usageData.message || "Failed to fetch usage data."]);
  //       }
  //     } catch (error) {
  //       setErrors(["An error occurred while fetching usage data."]);
  //     }
  //   };

  //   fetchData();
  // }, []);