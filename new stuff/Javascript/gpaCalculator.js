//extremely important variables for later
var isLoggedIn; //used to check if a user is logged in or not; this way, the program knows if data should be stored.
var currentUserId; //used to give a current ID for the logged in user; used for personalization.

// Function to initialize IndexedDB (this is used for the Log In page)
function initIndexedDB() {
  // Check if the browser supports IndexedDB
  if (!window.indexedDB) {
      console.log("Browser does not support a good version of IndexedDB.");
  }
  // Open or create a database named 'GPA_Calculator_DB' with "version 1"
  const request = indexedDB.open('GPA_Calculator_DB', 1);

  // Handle errors that could possibly happen when opening the database
  request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode);
  };

  //Connecting to the database successfully
  request.onsuccess = (event) => {
      console.log('IndexedDB working successfully');
  };

  // This event is triggered when the database needs to be upgraded (like version change)
  request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create an object store 'users' with 'username' as the key path
      const userStore = db.createObjectStore('users', { keyPath: 'username' });
      // Create an object store 'userData' with 'id' as auto-incrementing key path
      const dataStore = db.createObjectStore('userData', { keyPath: 'id', autoIncrement: true });
      // Create an index 'userId' in 'userData' object store for quick lookup by 'userId'
      dataStore.createIndex('userId', 'userId', { unique: false });
  };
}

initIndexedDB();

// Function to open the IndexedDB database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GPA_Calculator_DB', 1);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode);
      reject(event.target.errorCode);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// Function to add or get user data from IndexedDB
function manageUserData(action, user) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');

      if (action === 'add') {
        const request = store.add(user);
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.errorCode);
      } else if (action === 'get') {
        const request = store.get(user.username);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.errorCode);
      }
    });
  });
}

// Function to add or get user saved data from IndexedDB
function manageUserSavedData(action, data) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('userData', 'readwrite');
      const store = transaction.objectStore('userData');

      if (action === 'add') {
        const request = store.add(data);
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.errorCode);
      } else if (action === 'get') {
        const index = store.index('userId');
        const request = index.getAll(data.userId);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.errorCode);
      } else if (action === 'delete') {
        const index = store.index('userId');
        const getRequest = index.getAllKeys(data.userId);
        getRequest.onsuccess = (event) => {
          const keys = event.target.result;
          keys.forEach(key => store.delete(key));
          resolve(true);
        };
        getRequest.onerror = (event) => reject(event.target.errorCode);
      }
    });
  });
}

//function to go between Log In and Create Account
function toggleSection() {
  const loginSection = document.getElementById("loginSection");
  const createAccountSection = document.getElementById("createAccountSection");
  const returnMessageSection = document.getElementById("returnMessageSection");

  loginSection.classList.toggle("hidden");
  createAccountSection.classList.toggle("hidden");
}

//function to create account and see if the password and username are as good as they need to be
function createAccount(event) {
  event.preventDefault();  // Prevents the default form submission behavior

  // Get values from input fields
  const newUsername = document.getElementById("newUsername").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorMessage = document.getElementById("errorMessage");

  // Check if passwords match
  if (newPassword !== confirmPassword) {
    errorMessage.textContent = "Passwords do not match!";  // Display error message
    return;  // Exit the function early
  }

  // Check password length and absence of spaces
  if (newPassword.length < 8 || newPassword.includes(' ')) {
    errorMessage.textContent = "Password must be at least 8 characters long and should not contain spaces!";
    return;  // Exit the function early
  }

  // Check username for spaces
  if (newUsername.includes(' ')) {
    errorMessage.textContent = "Username should not contain spaces!";
    return;  // Exit the function early
  }

  // Clear previous error messages
  errorMessage.textContent = "";

  // Create user object
  const user = {
    username: newUsername,
    password: newPassword,
  };

  // Store user data in IndexedDB
  manageUserData('add', user).then(() => {
    // Clear form fields
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    // Show success message and return to login page
    showReturnMessage(errorMessage);
  }).catch(error => {
    errorMessage.textContent = "Username has already been taken!";  // Display error message
  });
}

//function to return a message that a new account was made
function showReturnMessage(errorMessage) {
  let countdown = 3;

  function updateCountdown() {
    errorMessage.textContent = `Success! Returning to login page in ${countdown}...`;
    countdown--;

    if (countdown >= 0) {
      // Continue the countdown
      setTimeout(updateCountdown, 1000);
    } else {
      // Reset the error message for future use
      errorMessage.textContent = "";

      // Redirect to the login page after the countdown
      redirectToLoginPage(); // Use the correct function name here
    }
  }

  // Start the countdown
  updateCountdown();
}

//function to go back to the login page after
function redirectToLoginPage() {
  console.log("Redirecting to the login page...");
  const loginSection = document.getElementById("loginSection");
  const createAccountSection = document.getElementById("createAccountSection");

  loginSection.classList.remove("hidden");
  createAccountSection.classList.add("hidden");
}

//function to process the entire log in feature (very important)
function login(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  console.log("An attempt to log in with username:", username, " has occurred.");

  // Retrieve user data from IndexedDB
  manageUserData('get', { username }).then(user => {
    if (user) {
      // Check if entered password matches stored password
      if (password === user.password) {
        console.log("Login successful.");
        alert("Login successful. Please click OK to see any saved data.");
        currentUserId = username;

        redirectToLoginPage(); // Redirect to the login page
        // Add your logic for successful login, e.g., update UI or redirect to another page
        document.querySelector('#loginSection').style.display = 'none';
        document.querySelector('#createAccountSection').style.display = 'none';

        const centerAfterLogin = document.querySelector('.centerAfterLogin');
        centerAfterLogin.style.display = 'block';

        // Shows a welcome sign in the HTML
        document.getElementById('loginWelcomeTitle').innerHTML = 'Welcome, ' + username + '!';
        document.getElementById('loginDisplayTitle').innerHTML = "You can find your saved data here.";

        // event listener
        const refreshButton = document.getElementById('refreshButton');


        refreshButton.addEventListener('click', () => {
          // Retrieve all keys in IndexedDB that match the user's pattern
          manageUserSavedData('get', { userId: currentUserId }).then(userData => {
            document.getElementById('logoutButton').addEventListener('click', logout);
        
            // Sort userData to display the data in order
            userData.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
        
            // Display all data for the user
            const infoForLoginParagraph = document.getElementById('infoForLogin');
            infoForLoginParagraph.innerHTML = ""; // Clear existing content
        
            userData.forEach(data => {
              // Check if savedDate is a valid date
              const savedDate = new Date(data.savedDate);
              const isValidDate = !isNaN(savedDate.getTime());
        
              if (!isValidDate) {
                // Handle the case where the date is invalid
                console.warn("Invalid date found in data:", data);
                return;
              }
        
              const dataItem = document.createElement('div');
              dataItem.classList.add('data-item');
        
              // Format the information in a structured way
              dataItem.innerHTML = `
                <h2>${savedDate.toLocaleDateString()}</h2>
                <p class="data-point"><span>Marking Period Count:</span> ${data.semesterNum}</p>
                <p class="data-point"><span>Unweighted GPA:</span> ${data.unweightedGPA}</p>
                <p class="data-point"><span>Weighted GPA:</span> ${data.weightedGPA}</p>
                <p class="data-point"><span></span> <a href="${data.pdfLink}" class="download_trans" target="_blank" download>Download Transcript</a></p>
                <button class="delete-data-button"></button> <!-- Delete Button -->
              `;
        
              // Append the data item to the   paragraph
              infoForLoginParagraph.appendChild(dataItem);
        
              // Add event listener to the delete button within each data item
              const deleteDataButton = dataItem.querySelector('.delete-data-button');
              deleteDataButton.addEventListener('click', () => {
                deleteData(data.id); // Call delete   function with the data id
                infoForLoginParagraph.removeChild(dataItem); // remove  data item from the UI (important)
              });
            });
          });
        });

        // for individual data deletion
        function deleteData(id) {
          manageUserSavedData('delete', { userId: currentUserId, id })
            .then(() => {
              console.log(`Data with id ${id} deleted successfully.`);
            })
            .catch(error => {
              console.error('Error deleting data:', error);
            });
        }

        const deleteDataButton = document.getElementById('deleteDataButton');
        deleteDataButton.addEventListener('click', () => {
          // Clear the existing content
          const infoForLoginParagraph = document.getElementById('infoForLogin');
          infoForLoginParagraph.innerHTML = " ";

          // Retrieve all keys in IndexedDB that match the user's pattern
          manageUserSavedData('delete', { userId: currentUserId }).then(() => {
            console.log("All user data deleted.");
          });
        });

        // Trigger the refresh initially
        refreshButton.click();

        isLoggedIn = true;
      } else {
        console.log("Incorrect username or password.");
        alert("Incorrect username or password.");

        isLoggedIn = false;
      }
    } else {
      console.log("Username not found. Please create a new account.");
      alert("Username not found. Please create a new account.");
      isLoggedIn = false;
    }
  }).catch(error => {
    console.error('Error retrieving user data:', error);
  });
}

//simple function to log out and make a live countdown
function logout() {
  console.log("Logging out...");
  isLoggedIn = false;
  currentUserId = null;

  const logoutText = document.querySelector('#logoutText');

  // Countdown from 3 to 1
  for (let countdown = 3; countdown > 0; countdown--) {
    setTimeout(() => {
      logoutText.innerHTML = `Logging out in ${countdown}...`;
    }, (3 - countdown) * 1000);
  }

  // After the countdown, this code resets the logout text and redirect to the login page
  setTimeout(() => {
    logoutText.innerHTML = "";
    document.querySelector('#loginSection').style.display = 'block';
    document.querySelector('.centerAfterLogin').style.display = 'none';
  }, 3000);  // 3000 milliseconds = 3 seconds
}

/**
 * GPA calculator code.
 * Allows user to input class info like name, grade, credits.
 * Calculates GPA based on grade point values for different grades.
 * Displays classes entered and calculated GPA.
 * Handles weighted GPA for Honors and AP classes.
*/
