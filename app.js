const cors=require('cors')
const express=require('express')
const axios=require('axios')
const bodyParser=require('body-parser')
const mysql=require('mysql')
const bcrypt = require('bcryptjs');
const { genQuestions } = require('./quiz')
const db=require('./db')

var app=express();

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const connection = mysql.createConnection({
    host: 'localhost',
    port:'3306',
    user: 'root',
    password: 'M1racle@123',
    database: 'Student_Management'
});

connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database: ' + err.stack);
      return;
    }
    console.log('Connected to database ');
  });

app.post('/register',(request,response)=>{
    const { id, userName, password, Department } = request.body;

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if(err)
        {
            throw err;
        }
        // console.log(hashedPassword);
        query='INSERT INTO UserDetails (id, designation, name, password, department) values(?,?,?,?,?)';
        console.log(query);
        connection.query(query,[id, 'faculty',userName, hashedPassword, Department],(err,res)=>{
            if(err)
            {
                console.log(err);
            }
            if(!res){
                console.log("User already Exists");
                response.status(401).send('User already Exists');
            }
            else
            {
                console.log("User added successfully");
            response.status(200).send('User registered successfully');
            }
        });

    });

});

app.post('/login',(request,response)=>{
    const { id, password } = request.body;

    query='SELECT * FROM UserDetails WHERE id=\''+id+'\'';
    console.log(query);
    connection.query(query,(err,res)=>{
        // console.log(res);
        const data=res[0];
        // console.log(data.password);
        console.log(res);
        if(err)
        {
            throw err;
        }
        else if(!res){
            console.log("User Not Found");
        }
        else{
            bcrypt.compare(password, data.password, (err, isMatch) => {
                if (err) throw err;
                
                if (isMatch) {
                    console.log("Login Successfull");
                    response.status(200).send('Login successful');
                } else {
                    console.log("Invalid Credentials");
                    response.status(401).send('Invalid credentials');
                }
              });
        }
    });
});

app.post('/sregister',(request,response) => {
    var { student_id, userName, faculty_id} = request.body;
    // faculty_id='20JRA0523'
    query='SELECT designation FROM UserDetails WHERE id=\''+faculty_id+'\'';
    connection.query(query,(err,res)=>{
        console.log(res[0].designation);
        if(err){
            throw err;
        }
        if(res[0].designation != "faculty"){
            console.log("You are not allowed");
            response.status(401).send("You are not allowed");
        }
        else{
            console.log("You are allowed");
            password=student_id.substring(0,3)+'@'+ userName.substring(0,3);
            // console.log(password)
            bcrypt.hash(password, 10, (err1, hashedPassword) =>{
                if(err1) throw err1;
                else {
                    query1='INSERT INTO UserDetails (id, designation, name, password, department) values(?,?,?,?,?)';
                    connection.query(query1,[student_id, 'student',userName, hashedPassword, 'CSE'],(err2,res2)=>{
                        if(err2) throw err2;
                        if(!res2){
                            console.log("Student already Exists");
                            response.status(401).send('Student already Exists');
                        }
                        else
                        {
                            console.log("Student added successfully");
                            response.status(200).send('Student added successfully');
                        }
                    })
                }
            })
        }
    })
})

createTest = async (testDetails)=>{
    const { subject, topic, noofQuestions } = testDetails;

        try{
            const requestData = {
"messages":[{
    role:'system',
    content:`You are an AI assistant who can act as a professor to create Assessment based on the technology. Your main objective is to identify the tech stack and create a questions, options and the answers with the below JSON format. 
Exaple: 
Q: example question
A:{
data:{
questions:[{What is the data type size of a char variable?, options:['4 Bytes', '2 Bytes', '5 Bytes', '8 Bytes'], correctAnswer:'C'}, ...]
}

Note : Do not add any extra data except the requested arrays and whole content should be placed inside a JSON.`
},{
    role:'user',
    content:`Can you give me single line ${noofQuestions} multiple choice questions on ${topic} in ${subject} with correct answers from the given options having hard complexity`
}]
               }
            const testData = await gatherData(requestData);
            // console.log(testData);
            return testData;
        }
        catch(error){
            console.log(error);
            return ({ error: 'Failed to generate questions' });
        }
}

async function gatherData(requestData){
    return await genQuestions(requestData);
}

app.post('/addTest', (request,response)=>{
    const { fact, testName, subject, topic, questions } = request.body;
    console.log(fact, testName, subject, topic, questions)
    finalData={}
    global.n=questions;
    
    query = "SELECT * FROM UserDetails WHERE id=\'"+fact+'\'';
    connection.query(query,async (err,res1)=>{
        if(err) throw err;
        if(!res1){
            console.log("Invalid faculty id");
            response.status(400).send("Invalid faculty id");
        }
        global.testQuestions = await createTest({testName, subject, topic, questions});
        // const finalData=JSON.parse(testQuestions);
        // console.log(testQuestions);
        try{
            const pattern = /\{[^{}]*\}/;
        for(i=0;i<questions;i++){
            let response1 = testQuestions.match(pattern)[0];
            finalData[i]=JSON.parse(response1);
        //   console.log('response1',JSON.parse(response1))
        }
        // console.log(finalData)
        // let response2 = testQuestions.match(pattern)[0]
        // console.log('response2',JSON.parse(response2))
        console.log("Data got");
        global.finalTestData=finalData;
        console.log(finalTestData);
        response.status(200).send(finalTestData);
        }
        catch(err1){
            response.send("Please try again");
        }
    })
})

app.post('/sendTest',(req,res)=>{
    console.log("Hello")
    const testID=req.body;
    console.log(testID.test);
    sql="SELECT QuestionName FROM QuestionDetails WHERE TestID=\'"+testID.test+'\'';
    console.log(sql);
    connection.query(sql,(err,data)=>{
        if(err) throw err;
        console.log(data);
        res.json(data);
    })
})

app.post('/sendQuestions',(req,res)=>{
    testId=req.body;
    console.log(testId);
    const questionsArray = Object.values(finalTestData).map(({ question, correctAnswer }) => ({
        question,
        correctAnswer
    }));
    console.log(questionsArray);
    cnt=0;
    for(i=0;i<questionsArray.length;i++){
        sql="INSERT INTO QuestionDetails(TestID,QuestionName,Answer) VALUES(?,?,?)";
        connection.query(sql,['3',questionsArray[cnt].question,questionsArray[cnt].correctAnswer],(err,data)=>{
            if(err) throw err;
            // console.log(data);
            cnt++;
        })
    }
    res.send(questionsArray)
})

app.post('/validate',(req,res)=>{
    const {testId,StudentId,qa,an}= req.body
    score=0;
    sql="SELECT * FROM QuestionDetails WHERE TestID=\'"+testId+'\'';
    connection.query(sql,(err,data)=>{
        if(err) throwerr;
        for(i=0;i<data.length;i++){
            console.log("question"+data[i].QuestionName);
            console.log("answer"+data[i].Answer);
            for(j=0;j<qa.length;j++)
            {
                if(qa[j]==data[i].QuestionName && an[j] == data[i].Answer){
                    score=score+1;
                }
            }
        }
        sql1="INSERT INTO Reports(studentID,TestID,score) values(?,?,?)"
        connection.query(sql1,[StudentId,testId,score],(err,data1)=>{
            if(err) throw err;
            console.log(score);
            console.log(data1);
            res.send("successfully inserted");
        })
    })
})

//gives tests for students
app.get('/tests',(req,res)=>{

    db.getTests()
    .then((tests)=>{
        res.send(tests)
    })
    
    .catch((err)=>{
        res.send(err)
    })
})

//gives questions of particular tests
app.post('/testQuestions',(req,res)=>{

    db.getTestsQuestions(req.body.id)
    .then((tests)=>{
        res.send(tests)
    })
    
    .catch((err)=>{
        res.send(err)
    })
})

//tests created by faculty
app.post('/test_details',(req,res)=>{

    db.getTestDetails(req.body.id)
    .then((details)=>{
        res.send(details)
    })  
    
    .catch((err)=>{
        res.send(err)
    })
})

//student validation

// for student isualization purpose
app.post('/sreports',(req,res)=>{
    var result='';
    var finalData=[];
    db.getStudentReports(req.body.studentID)
    .then((details)=>{
        for(i=0;i<details.length;i++){
            result=(details[i].score < 4 ? 'fail' : 'pass')
            var dummy={
                testId:details[i].TestID,
                score:details[i].score,
                result:result
            }
            finalData.push(dummy);
        }
        if(finalData.length==0){
            res.json("No tests attempted");
        }
        res.send(finalData);
    })  
    .catch((err)=>{
        res.send(err)
    })
})


//inserting test details
app.post('/addTest',(req,res)=>{
    console.log(req.body.ID,req.body.TestName)
    db.addTestDetails(req.body.ID,req.body.TestName)
    .then((rows)=>{
        res.send("data inserted successfully")
    }) 

    .catch((err)=>{
        res.sendStatus(err)
    })

})

app.listen(3006,()=>{
    console.log("Server started running on http://localhost:3006");
});
