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

// Initial variables to get references to HTML elements, to later calculate and display GPA
const form = document.getElementById('gpa-form');
const tableBody = document.querySelector('#classes tbody');
const gpaOutput = document.getElementById('gpa');
const unweightedGPAOutput = document.getElementById('unweighted-gpa');

// Initialize GPA outputs
gpaOutput.textContent = '-';
unweightedGPAOutput.textContent = '-';

// An object that defines the grade values for BRHS, which will be used for calculations later
const gradeValues = {
  'A+': { 'AP': 5.33, 'Honors': 5.00, 'Regular': 4.33 },
  'A': { 'AP': 5.00, 'Honors': 4.67, 'Regular': 4.00 },
  'A-': { 'AP': 4.67, 'Honors': 4.33, 'Regular': 3.67 },
  'B+': { 'AP': 4.33, 'Honors': 4.00, 'Regular': 3.33 },
  'B': { 'AP': 4.00, 'Honors': 3.67, 'Regular': 3.00 },
  'B-': { 'AP': 3.67, 'Honors': 3.33, 'Regular': 2.67 },
  'C+': { 'AP': 3.33, 'Honors': 3.00, 'Regular': 2.33 },
  'C': { 'AP': 3.00, 'Honors': 2.67, 'Regular': 2.00 },
  'C-': { 'AP': 2.67, 'Honors': 2.33, 'Regular': 1.67 },
  'D+': { 'AP': 2.33, 'Honors': 2.00, 'Regular': 1.33 },
  'D': { 'AP': 2.00, 'Honors': 1.67, 'Regular': 1.00 },
  'D-': { 'AP': 1.67, 'Honors': 1.34, 'Regular': 0.67 },
  'U': { 'AP': 0.00, 'Honors': 0.00, 'Regular': 0.00 }
}

// bariables to track total credits and points (of each added class)
let totalCredits = 0;
let totalPoints = 0;

// Add event listener to the form for when class details are submitted
form.addEventListener('submit', e => {
  e.preventDefault();

  // Get class details from the form inputs
  const name = form.elements['class-name'].value;
  const letterGrade = form.elements['grade'].options[form.elements['grade'].selectedIndex].text;
  const grade = parseFloat(form.elements['grade'].value); // (float)
  const credits = parseFloat(form.elements['credits'].value); // (float)
  const type = form.elements['class-type'].value;

  // function to add class to the table
  addClass(name, letterGrade, credits, type, grade);
});


// Function to add a class to the table
function addClass(name, letterGrade, credits, type, grade) {
  let currentSemesterTable = document.querySelector('#newMPs table:last-of-type tbody');

  if (!currentSemesterTable) {
      currentSemesterTable = tableBody;
  }

  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const letterCell = document.createElement('td');
  const creditsCell = document.createElement('td');
  const typeCell = document.createElement('td');
  const gradeCell = document.createElement('td');
  const editCell = document.createElement('td');
  const deleteCell = document.createElement('td');


  nameCell.textContent = name;
  letterCell.textContent = letterGrade;
  creditsCell.textContent = credits;
  typeCell.textContent = type;

  if (type === 'Honors') {
      grade = gradeValues[letterGrade]['Honors'];
  } else if (type === 'AP') {
      grade = gradeValues[letterGrade]['AP'];
  }

  gradeCell.textContent = grade.toFixed(2);

  // Initialize data attributes
  nameCell.setAttribute('data-credits', credits);
  nameCell.setAttribute('data-letter-grade', letterGrade);
  nameCell.setAttribute('data-type', type);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-class-button';
  deleteButton.textContent = '';
  deleteButton.addEventListener('click', () => {
      row.classList.add('fade-out');
      row.addEventListener('animationend', () => {
          deleteClass(row, credits, letterGrade, type);
      });
  });

  const editButton = document.createElement('button');
  editButton.className = 'edit-class-button';
  editButton.textContent = '';
  editButton.addEventListener('click', () => {
      if (editButton.textContent === '') {
          editClass(row, name, letterGrade, credits, type);
          editButton.textContent = ' ';
      } else {
          saveClass(row, nameCell, letterCell, creditsCell, typeCell, gradeCell, editButton);
          editButton.textContent = '';
      }
  });

  deleteCell.appendChild(deleteButton);
  editCell.appendChild(editButton);

  row.appendChild(nameCell);
  row.appendChild(letterCell);
  row.appendChild(creditsCell);
  row.appendChild(typeCell);
  row.appendChild(gradeCell);
  row.appendChild(editCell);
  row.appendChild(deleteCell);


  currentSemesterTable.appendChild(row);

  const gradeValue = gradeValues[letterGrade][type];
  totalCredits += credits;
  totalPoints += gradeValue * credits;

  calculateGPA();
  calculateUnweightedGPA();

  document.getElementById('class-name').value = '';
}


//update: new edit feature (june 26th 2024)
function editClass(row, name, letterGrade, credits, type) {
  const cells = row.children;

  cells[0].innerHTML = `<input id="edit-name-select" type="text" value="${name}">`;
  
  // Create a dropdown for letter grade with current value selected
  cells[1].innerHTML = `
      <select id="edit-grade-select">
          ${Object.keys(gradeValues).map(grade => `<option value="${grade}" ${grade === letterGrade ? 'selected' : ''}>${grade}</option>`).join('')}
      </select>`;
  
  cells[2].innerHTML = `<input id="edit-credit-select" type="number" value="${credits}" step="0.1">`;
  
  // Create a dropdown for class type
  cells[3].innerHTML = `
      <select id="edit-type-select">
          <option value="Regular" ${type === 'Regular' ? 'selected' : ''}>Regular</option>
          <option value="Honors" ${type === 'Honors' ? 'selected' : ''}>Honors</option>
          <option value="AP" ${type === 'AP' ? 'selected' : ''}>AP</option>
      </select>`;
}




//update: new delete feature (june 25th 2024)
function deleteClass(row, credits, letterGrade, type) {
  // Remove the row from the table
  row.remove();

  // Update totalCredits and totalPoints
  const gradeValue = gradeValues[letterGrade][type];
  totalCredits -= credits;
  totalPoints -= gradeValue * credits;

  // Recalculate GPAs
  calculateGPA();
  calculateUnweightedGPA();
}



// Update for saving an edited class
function saveClass(row, nameCell, letterCell, creditsCell, typeCell, gradeCell, editButton) {
  // Get new values from the input fields
  const name = row.children[0].querySelector('input').value;
  const letterGrade = row.children[1].querySelector('select').value;
  const credits = parseFloat(row.children[2].querySelector('input').value);
  const type = row.children[3].querySelector('select').value;

  // Get the old values from the data attributes before updating
  const oldCredits = parseFloat(nameCell.getAttribute('data-credits'));
  const oldLetterGrade = nameCell.getAttribute('data-letter-grade');
  const oldType = nameCell.getAttribute('data-type');

  // Set data attributes to the new values
  nameCell.setAttribute('data-credits', credits);
  nameCell.setAttribute('data-letter-grade', letterGrade);
  nameCell.setAttribute('data-type', type);

  // Update the table cells with new values
  nameCell.textContent = name;
  letterCell.textContent = letterGrade;
  creditsCell.textContent = credits;
  typeCell.textContent = type;

  // Calculate the new grade value
  let grade = gradeValues[letterGrade]['Regular'];
  if (type === 'Honors') {
    grade = gradeValues[letterGrade]['Honors'];
  } else if (type === 'AP') {
    grade = gradeValues[letterGrade]['AP'];
  }
  gradeCell.textContent = grade.toFixed(2);

  // Update totalCredits and totalPoints with the new values
  const oldGradeValue = gradeValues[oldLetterGrade][oldType];
  totalCredits += credits - oldCredits;
  totalPoints += (grade * credits) - (oldGradeValue * oldCredits);

  // Recalculate GPAs
  calculateGPA();
  calculateUnweightedGPA();
}





// Variables to store calculated GPAs
let calculatedGPA;
let calculatedUnweightedGPA;

// Function to calculate weighted GPA
function calculateGPA() {
  if (totalCredits === 0) {
    gpaOutput.textContent = '-';
    return;
  }
  const gpa = totalPoints / totalCredits;
  if (!isNaN(gpa)) {
    gpaOutput.textContent = gpa.toFixed(2);
  } else {
    gpaOutput.textContent = '-';
  }
}

// Function to calculate unweighted GPA
function calculateUnweightedGPA() {
  // Reset total credits and points for unweighted GPA calculation
  let totalCredits = 0;
  let totalPoints = 0;

  // Include the original semester
  const originalRows = document.querySelectorAll('#classes tbody tr');
  calculateGPAForSemester(originalRows);

  // Include additional semesters
  const semestersContainer = document.getElementById('newMPs');
  const semesterTables = semestersContainer.querySelectorAll('table');

  semesterTables.forEach(table => {
    const rows = table.querySelectorAll('tbody tr');
    calculateGPAForSemester(rows);
  });

  // Function to calculate GPA for a semester
  function calculateGPAForSemester(rows) {
    rows.forEach(row => {
      const credits = parseFloat(row.cells[2].textContent);
      totalCredits += credits;

      const letterGrade = row.cells[1].textContent;

      // Use Regular grade values for unweighted GPA
      const gradeValue = gradeValues[letterGrade]['Regular'];

      totalPoints += gradeValue * credits;
    });
  }

  // Calculate unweighted GPA and update output
  const unweightedGPA = totalPoints / totalCredits;
  if (!isNaN(unweightedGPA)) {
    document.getElementById('unweighted-gpa').textContent = unweightedGPA.toFixed(2);
  } else {
    document.getElementById('unweighted-gpa').textContent = '-';
  }
}

// Initialize semester count (it is 1 because the GPA calculator always starts with 1 semester)
let semesterCount = 1;

// Event listener for when the document is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Event listener for adding a new semester
  document.getElementById('add-mp').addEventListener('click', function (e) {
    e.preventDefault();
    addSemester();
  });

  // Function to add a new semester
  function addSemester() {
    semesterCount++;

    // Create a new paragraph for the semester
    const newSemester = document.createElement('p');
    newSemester.classList.add('add-mp-text');
    newSemester.textContent = 'Marking Period ' + semesterCount;

    // Create a new table for the semester
    const newTable = document.createElement('table');
    newTable.id = 'nextClasses';
    newTable.innerHTML = `
        <thead>
            <tr>
                <th id= "class-name-table">Class Name</th>
                <th id="class-grade-table">Letter Grade</th>
                <th id="class-credit-table">Credits</th>
                <th id="class-type-table">Course Type</th>
                <th id="class-gpa-table">Grade GPA</th>
                <th id="class-edit-table">Edit</th>
                <th id="class-delete-table">Delete</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    // Create a delete semester button
    const deleteButton = document.createElement('button');
    deleteButton.id = 'delete-semester';
    deleteButton.textContent = 'Delete Marking Period';
    deleteButton.addEventListener('click', function () {
      deleteSemester(newSemester, deleteButton, newTable);
    });

    //ap- the new paragraph, delete button, and table to the #newMPs container
    document.getElementById('newMPs').appendChild(newSemester);
    document.getElementById('newMPs').appendChild(deleteButton);
    document.getElementById('newMPs').appendChild(newTable);

    // Update numbering for other semesters
    updateSemesterNumbering();
  }

  // Function to delete a semester
  function deleteSemester(semesterParagraph, deleteButton, semesterTable) {
    // Get the rows of the semester that is being deleted
    const rows = semesterTable.querySelectorAll('tbody tr');

    // Remove the semester paragraph, delete button, and table
    semesterParagraph.remove();
    deleteButton.remove();
    semesterTable.remove();

    // Subtract the points and credits from the deleted semester, so there isn't uneeded data
    rows.forEach(row => {
      const credits = parseFloat(row.cells[2].textContent);
      const letterGrade = row.cells[1].textContent;
      const gradeValue = gradeValues[letterGrade]['Regular'];
      totalCredits -= credits;
      totalPoints -= gradeValue * credits;
    });

    // Recalculate the GPA after updating points and credits, utilizing three separate functions
    calculateUnweightedGPA();
    updateSemesterNumbering();
    calculateGPA();
  }

  // Function to update semester numbering
  function updateSemesterNumbering() {
    const semesterParagraphs = document.querySelectorAll('.add-mp-text');
    semesterParagraphs.forEach((paragraph, index) => {
      paragraph.textContent = 'Marking Period ' + (index + 1);
    });
  }
});

// Initialize variable "mainDeleteButton"
const mainDeleteButton = document.getElementById('delete');

// Event listener for the main delete button
mainDeleteButton.addEventListener('click', () => {
  totalCredits = 0;
  totalPoints = 0;
  semesterCount = 1;

  // Clear the main table and reset GPA outputs
  tableBody.innerHTML = '';
  gpaOutput.textContent = '-';
  unweightedGPAOutput.textContent = '-';

  // Remove all added semesters and tables
  const semestersContainer = document.getElementById('newMPs');
  semestersContainer.innerHTML = '';

  // Recalculate the GPAs
  calculateUnweightedGPA();
  calculateGPA();
});

// Get reference to the save data button
const saveDataButton = document.getElementById('save-data');
let pdfLinkForLogin;
// Event listener for the save data button
saveDataButton.addEventListener('click', () => {
  if (isLoggedIn) {
    // User is logged in, save data to the specific user's account
    generatePDF().then((pdfUrl) => {
      pdfLinkForLogin = pdfUrl;
      saveDataForLoggedInUser();
      console.log(pdfLinkForLogin);
    }).catch((error) => {
      console.error("Error generating PDF:", error);
      alert("There was an error generating the PDF. Please try again.");
    });
  } else {
    // User is not logged in, show "plz log in" alert
    alert("Please log in to save your data. \nThere is a Log In tab in the top right corner of the page.");
  }
});


// Function to save data for a logged-in user
function saveDataForLoggedInUser() {
  console.log("Starting to save data.... (beginning)");

  // Get the current user's ID
  const userId = currentUserId;

  // Create a new set of data
  const newData = {
    userId: userId,
    semesterNum: document.querySelectorAll('.add-mp-text').length,
    weightedGPA: parseFloat(gpaOutput.textContent) || 0,
    unweightedGPA: parseFloat(unweightedGPAOutput.textContent) || 0,
    savedDate: new Date().toISOString(), // Set the current date in ISO format
    pdfLink: pdfLinkForLogin,
  };

  // Save the new data to IndexedDB
  manageUserSavedData('add', newData).then(() => {
    // Show success alert/message
    alert("Data saved successfully!");
    console.log("Saved data.... (end)");
  }).catch(error => {
    console.error('Error saving data:', error);
  });
}







//Now shifting to the PDF part of the code - this is used in the Login Page









// Function to generate PDF report and return a Promise with the Blob URL
function generatePDF() {
  return new Promise((resolve, reject) => {
    try {
      const username = currentUserId; //user id
      const { jsPDF } = window.jspdf; //jSPDF
      const doc = new jsPDF(); //?

      // Function to set the background color for the page
      function setBackground(doc) {
        doc.setFillColor('#F1F2F3'); // Background color
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
      }

      // Set background color for the first page
      setBackground(doc);

      // Title and user information section
      doc.setTextColor('#0a2e7f'); // Text color
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(`GPA Report for ${username}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor('#0a2e7f');
      doc.text(`Weighted GPA: ${document.getElementById('gpa').textContent}`, doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
      doc.text(`Unweighted GPA: ${document.getElementById('unweighted-gpa').textContent}`, doc.internal.pageSize.getWidth() / 2, 55, { align: 'center' });

      // Add the original table content
      const originalRows = Array.from(document.querySelector('#classes tbody').rows);
      let startY = 80;
      doc.setFontSize(18);
      doc.setTextColor('#2d2b2b'); // Text color
      doc.setFont('helvetica', 'bold');
      doc.text('Marking Period 1', 20, startY);
      startY += 10;
      addTableToPDF(doc, originalRows, startY);

      // Retrieve and add all marking periods (semesters)
      const markingPeriods = document.querySelectorAll('#newMPs .add-mp-text');
      markingPeriods.forEach((mp, index) => {
        doc.addPage();
        setBackground(doc); // Set background color for the new page
        let startY = 20;

        // Add heading for marking period
        doc.setFontSize(18);
        doc.setTextColor('#2d2b2b');
        doc.setFont('helvetica', 'bold');
        doc.text(mp.textContent, 20, startY);

        // Get the table for the current marking period
        const table = document.querySelectorAll('#newMPs table')[index];
        const rows = Array.from(table.querySelectorAll('tbody tr'));

        // Add the table to the PDF
        addTableToPDF(doc, rows, startY + 10);
      });

      // Footer section
      doc.setTextColor('#2d2b2b');
      doc.setFontSize(10);
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Generated by Grade Guru on: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }

      // Generate the PDF as Blob and create a URL
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Resolve the Promise with the PDF URL
      resolve(pdfUrl);
    } catch (error) {
      // Reject the Promise if an error occurs
      reject(error);
    }
  });
}

// Function to add a table to the PDF
function addTableToPDF(doc, rows, startY) {
  if (!rows.length) {
    return;
  }

  doc.setFontSize(12);
  doc.setTextColor('#2d2b2b'); // Text color
  let currentY = startY;

  // Table headers
  const headers = ['Class Name', 'Letter Grade', 'Credits', 'Course Type', 'Grade GPA'];
  const cellWidth = (doc.internal.pageSize.getWidth() - 20) / headers.length;
  const lineHeight = 15;

  // Draw headers and vertical lines
  doc.setLineWidth(0.1);
  doc.setDrawColor('#2d2b2b');
  doc.setFillColor('#f4ab19'); // Header background color
  doc.rect(10, currentY, doc.internal.pageSize.getWidth() - 20, lineHeight, 'F');
  headers.forEach((header, index) => {
    doc.text(header, 15 + index * cellWidth, currentY + 10);
    if (index > 0) {
      doc.line(10 + index * cellWidth, currentY, 10 + index * cellWidth, currentY + lineHeight);
    }
  });

  // Table rows
  doc.setFont('helvetica', 'normal');
  rows.forEach(row => {
    currentY += lineHeight;
    const rowData = Array.from(row.cells).map(cell => cell.textContent);
    doc.setDrawColor('#2d2b2b');
    doc.rect(10, currentY, doc.internal.pageSize.getWidth() - 20, lineHeight, 'S');
    rowData.forEach((cell, index) => {
      doc.text(cell, 15 + index * cellWidth, currentY + 10);
      if (index > 0) {
        doc.line(10 + index * cellWidth, currentY, 10 + index * cellWidth, currentY + lineHeight);
      }
    });

    // Check if the current Y position exceeds the page height, and add a new page if necessary
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      setBackground(doc); // Set background color for the new page
      currentY = 20;

      // Redraw headers for new page
      doc.setLineWidth(0.1);
      doc.setDrawColor('#2d2b2b');
      doc.setFillColor('#f4ab19');
      doc.rect(10, currentY, doc.internal.pageSize.getWidth() - 20, lineHeight, 'F');
      headers.forEach((header, index) => {
        doc.text(header, 15 + index * cellWidth, currentY + 10);
        if (index > 0) {
          doc.line(10 + index * cellWidth, currentY, 10 + index * cellWidth, currentY + lineHeight);
        }
      });
      currentY += lineHeight;
    }
  });
}











//Calculating the weighted and unweighted GPA notes and steps:


// Step 1: Initialize variables and references to HTML elements
// - Get references to form, table, and output elements
// - Initialize placeholders for GPA outputs

// Step 2: Define grade values for different letter grades and course types
// - Create a mapping of letter grades to corresponding GPA values for Regular, Honors, and AP courses

// Step 3: Add event listener to the form for submitting class details
// - Listen for form submissions to capture class details for calculation

// Step 4: Extract class details from form inputs
// - Retrieve class name, letter grade, credits, type, and grade from form inputs

// Step 5: Add class to the table
// - Create a new row in the table with class details
// - Adjust grade for Honors and AP classes based on the grade values

// Step 6: Update total credits and points, then recalculate GPAs
// - Update the cumulative credits and points based on the added class
// - Recalculate both weighted and unweighted GPAs

// Step 7: Calculate weighted GPA
// - Divide total points by total credits to get the weighted GPA
// - Update the weighted GPA output element

// Step 8: Calculate unweighted GPA
// - Iterate through semesters and classes to calculate total points and credits for unweighted GPA
// - Divide total points by total credits to get the unweighted GPA
// - Update the unweighted GPA output element

// Step 9: Handle adding and deleting semesters
// - Add functionality to add and delete semesters with associated classes
// - Update semester numbering and recalculate GPAs accordingly

// Step 10: Save data for logged-in users
// - Save the user's semester data, including GPAs and other information, to indexedDB
// - Generate a unique data key for each user

// Step 11: Display alerts for user interaction
// - Show alerts for login prompts, successful data saving, and other user interactions

// Step 12: Main delete button functionality
// - Reset total credits, points, and semester count when deleting all data
// - Clear tables and update GPA outputs accordingly

















//Steps for the PDF Report on Grade Guru:
  // Event Listener for Button Click:
      // Attach a click event listener to the element with ID downloadReport.
      // On click, check if the user is logged in (on the actual GPA code this is isLoggedIn).
      // If logged in, call generatePDF().
      // If not logged in, display an alert prompting the user to log in.


  // generatePDF() Function:
      // Retrieve the currentUserId and initialize a new jsPDF document (doc).
      // Define a function setBackground to set the background color of the PDF pages.


  // First Page Setup:
      // Set the background color for the first page.
      // Add the title "GPA Report for [username]" at the top center of the page.
      // Add GPA information (Weighted and Unweighted) below the title.


  // Marking Period 1 Table:
      // Retrieve the rows from the table in #classes tbody.
      // Add a header "Marking Period 1" and insert the table content into the PDF using addTableToPDF.


  // Additional Marking Periods:
      // Retrieve all marking periods from #newMPs .add-mp-text.
      // For each marking period, add a new page, set the background color, and add a heading.
      // Retrieve and add the corresponding table content using addTableToPDF.


  // Footer Section:
      // Add a footer to each page with the generation date and page numbers.


  // Save PDF:
      // Save the generated PDF with the filename format "[username]'s GPA Report.pdf".


  // addTableToPDF(doc, rows, startY) Function:
      // Check if there are rows to add.
      // Define table headers and set cell width and line height.
      // Draw headers and vertical lines.
      // Iterate over each row, add the content to the PDF, and draw table rows.
      // Check for page overflow and add a new page if necessary, redrawing the headers on the new page.
