// Function to show a specific content section (very important)
function showSection(sectionId, headerText, contentText) {
  var sections = document.getElementsByClassName('content'); //specific content
  for (var i = 0; i < sections.length; i++) { 
      sections[i].style.display = 'none'; //hides other sections that are not being used
  }

  document.getElementById(sectionId).style.display = 'block'; //displays the section that will be used
  document.getElementById('headerTitle').textContent = headerText; //updates header title: for example: "Home" to "Community"
  document.getElementById('contentText').textContent = contentText;  //updates main content
  
}

// Function to set the default section when the page loads
function setDefaultSection() {
  showSection('section1', 'Home', 'Welcome to Grade Guru! Explore a multitude of features.');
}

// Function to show the GPA calculator section
function showCalculator() {
  showSection('calculator-gpa', 'GPA Calculator', 'Effortlessly calculate your GPA. \n To get started, enter your class information, and click "Add Class" to add it to the table.');
}





window.onload = setDefaultSection; //when website is loaded, shows the Home page

// Create buttons dynamically and add event listeners

var button1 = document.createElement('button');
button1.className = 'button';
button1.textContent = 'GPA Calculator';
button1.onclick = showCalculator;


document.getElementById('buttonContainer').appendChild(button1);









