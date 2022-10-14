---
layout: post
title:  "Programming Software For The Symbol MC70"
---

# Background
One of my first jobs "in the industry" was programming software for a fulfillment center near Wigan. It was a great place to work in terms of technology as a lot of the code you wrote was directly impacting throughput and performance of the warehouse. It also meant working with a few pieces of physical technology such as the [Cubiscan 100](https://cubiscan.com/cubiscan-100/); [Zebra GK420d label printers](https://www.thebarcodewarehouse.co.uk/barcode-printers-label-printers/desktop/GK42-202520-000/?ppc_keyword=&utm_term=&utm_campaign=All+Products&utm_source=adwords&utm_medium=ppc&hsa_acc=6299398270&hsa_cam=671071604&hsa_grp=36921298227&hsa_ad=144620662237&hsa_src=g&hsa_tgt=pla-58909121666&hsa_kw=&hsa_mt=&hsa_net=adwords&hsa_ver=3) and others bit of equipment that I might write about soon.

Most of the warehouse equipment had a lot of support and was fairly easy write code for. Until in October 2017, my manager decided to put one of these on my desk

![Symbol MC70](https://storage.googleapis.com/rexchoppers-website-assets/symbol-mc70.jpeg "Symbol MC70"){: width="250" }

[MC70 Spec Sheet](https://storage.googleapis.com/rexchoppers-website-assets/mc70-spec-sheet.pdf)

[Image Source](https://www.thebarcodewarehouse.co.uk/shop/motorola/motorola-discontinued-products/symbol-mc70/)

The warehouse had a single PC with a barcode scanner that they used for loading in/out items to/from couriers. Whilst this worked well for small parcels, pallets, large/heavy items were an issue. The solution was to create an application on this device that would allow warehouse staff to easily load items in/out of the warehouse and from any loading bay. 

I had minimal production experience with .NET and C# at this point, but wanted a challenge (And I was still in my probation period) so I went ahead with a prototype application for this device. All seemed to go well...Until I wanted to send a HTTP request to the API.

Note: I do not have permission to post my old employers code so any code I'll be posting will be from the initial open-source prototype we used as a proof of concept.

# Getting Started
I'm unsure of the release date of this device but I'm pretty sure I was still in primary school at this point. None of the software would work on my usual PC so I had to use the following

#### Windows XP
The only choice I had was to use Windows XP in order to install all the relevant software. I grabbed the lowest spec computer, flashed a USB and installed Windows XP again.

Whilst there was an option to use a VM, the lag whilst programming would have driven me crazy compared to a separate machine and a KVM.

I was terrified about installing lots of old software on this PC and having it anywhere near the company's network, so builds were transferred via USB instead.

![Under my work's desk](https://storage.googleapis.com/rexchoppers-website-assets/windows-xp-machine.jpeg "Under my work's desk"){: width="250" }

#### Visual Studio 2005
With Windows XP installed, I managed to locate a free install of Visual Studio 2005 on a website.

The picture isn't very clear but subsequent photos will be better. This was a quick picture I took to mark my progress of the prototype

[Wiki for Visual Studio](https://en.wikipedia.org/wiki/Visual_Studio#History)

![Visual Studio 2005](https://storage.googleapis.com/rexchoppers-website-assets/visual-studio-2005.jpeg "Visual Studio 2005"){: width="250" }

#### FTP Server
We had the charging attachment for this device but nothing to connect it to the PC. We opted to use the on-prem Filezilla server to distribute builds (.CAB files)

#### A New Access Point
During this prototype, we found that the signal near the door wasn't the best causing network issues to occur. Wether this was down to the device not being great or the Wi-Fi in that area being poor, we opted to get another cheap AP installed for smoother operation (And to also prevent support tickets coming in)

# The Coding
Project Technical details (Extracted from .csproj file):
* TargetFrameworkVersion: v3.5
* OSVersion: 5.1
* NativePlatformName: Windows Mobile 5.0 Pocket PC SDK

I've always said that Visual Studio is heavy as a piece of software but very easy to navigate and for someone who is crap at UI, I liked the drag and drop solutions that they had.

Most of the programming was simple, for example in the original prototype we were able to handle all kinds of different features and scenarios

**Reconnection screen on disconnect**
```c#
public partial class ReconnectToNetwork : Form, BaseEvents
    {
        public ReconnectToNetwork(string windowName)
        {
            InitializeComponent();

            this.Text = windowName;

            MessageBox.Show("NO CONNECTION. MOVE TO NEW LOCATION & PRESS RECONNECT");
        }

        public void CloseEvent(object sender, System.EventArgs e)
        {
            Application.Exit();
        }

        private void FullExitApplication(object sender, EventArgs e)
        {
            Application.Exit();
        }

        private void TryReconnect(object sender, EventArgs e)
        {
            Cursor.Current = Cursors.WaitCursor;

            string pingResponse = (string) Rest.SendRequest(Program.MAIN_PING, new String[0], new NameValueCollection());

            Cursor.Current = Cursors.Default;

            if (pingResponse == "PONG")
            {
                MessageBox.Show("RECONNECTED");

                Cursor.Current = Cursors.WaitCursor;

                this.Hide();

                new Login("Login").Show();

                Cursor.Current = Cursors.WaitCursor;
            }
            else
            {
                MessageBox.Show("FAILED TO CONNECT. TRY AGAIN");
            }

            Cursor.Current = Cursors.Default;
        }
    }
```

**Code (Modified from a very old forum) for capturing a signature**
```c#
public partial class _5_Bulk_DriverSig : Form
    {
        bool drawn = false;
        bool IsCapturing = false;

        private Point startPoint;
        private Point endPoint;

        Pen pen = new Pen(Color.Black);
        
        Glyph glyph = null;
        Signature signature = new Signature();

        public _5_Bulk_DriverSig(string windowName)
        {
            InitializeComponent();

            LoadOut_Controller.bulk_driversig = this;

            this.Text = windowName;
            this.ControlBox = false;
        }

        // Signature events
        private void SignatureMouseMove(object sender, MouseEventArgs e)
        {
            if (IsCapturing)
            {
                if (startPoint.IsEmpty && endPoint.IsEmpty)
                {
                    endPoint = new Point(e.X, e.Y);
                }
                else
                {
                    startPoint = endPoint;
                    endPoint = new Point(e.X, e.Y);
                    Line line = new Line(startPoint, endPoint);
                    glyph.Lines.Add(line);
                    DrawLine(line);
                }

            }
        }

        private void SignatureMouseUp(object sender, MouseEventArgs e)
        {
            IsCapturing = false;
            signature.Glyphs.Add(glyph);
            startPoint = new Point();
            endPoint = new Point();
        }

        private void SignatureMouseDown(object sender, MouseEventArgs e)
        {
            IsCapturing = true;
            glyph = new Glyph();

            drawn = true;
        }


        private void Finish(object sender, EventArgs e)
        {
            if (!drawn)
            {
                MessageBox.Show("NO SIGNATURE");
                return;
            }

            Cursor.Current = Cursors.WaitCursor;

            int width = panel_signature.Width;
            int height = panel_signature.Height;

            string time = DateTime.Now.ToString("h-mm-ss").Replace(":", "");
            time = time.Replace(" ", "");

            // Replacing here for better version control
            string to_save = @"cnote_" + DateTime.Today.ToString("yyyy-MM-dd").Replace("/", "").Replace(":", "").Replace(" ", "_");
            to_save = to_save + "_" + time;

            string when_tosend = DateTime.Today.ToString("yyyy-MM-dd") + " " + DateTime.Now.ToString("h-mm-ss");

            // Create the directory that we are going to store all of our files in
            if (!Directory.Exists(Program.FILE_TOSTORECOLLECTIONNOTES + to_save))
            {
                Directory.CreateDirectory(Program.FILE_TOSTORECOLLECTIONNOTES + to_save);
            }

            string DTS = Program.FILE_TOSTORECOLLECTIONNOTES + to_save + "/";

            XmlSerializer serailize = new XmlSerializer(typeof(Signature));

            if (File.Exists(DTS + to_save))
            {
                File.Delete(DTS + to_save);
            }

            using (TextWriter textWriter = new StreamWriter(DTS + to_save))
            {
                serailize.Serialize(textWriter, signature);
                textWriter.Close();
            }

            Signature sig = DeserializeSignature(DTS + to_save);
            using (Bitmap bitmap = new Bitmap(226, 138))
            {
                using (Graphics graphics = Graphics.FromImage(bitmap))
                {
                    graphics.Clear(Color.White);

                    Pen pen = new Pen(Color.Black);
                    foreach (Glyph glyph in sig.Glyphs)
                    {
                        foreach (Line line in glyph.Lines)
                        {
                            graphics.DrawLine(pen,
                                line.StartPoint.X,
                                line.StartPoint.Y,

                                line.EndPoint.X,
                                line.EndPoint.Y
                                );
                        }
                    }
                }
                bitmap.Save(DTS + to_save + ".jpg", ImageFormat.Jpeg);
            }

            // Send information to API

            Cursor.Current = Cursors.Default;
        }

        private void Back(object sender, EventArgs e)
        {
            signature.Clear();

            LoadOut_Controller.bulk_driverreg.Show();
            this.Hide();
        }

        private void Clear(object sender, EventArgs e)
        {
            ClearSignaturePanel();
            drawn = false;
        }

        private Signature DeserializeSignature(string fileName)
        {
            Signature sig = new Signature();

            XmlSerializer des = new XmlSerializer(typeof(Signature));
            using (TextReader textReader = new StreamReader(fileName))
            {
                sig = (Signature)des.Deserialize(textReader);
                textReader.Close();
            }
            return sig;
        }

        private void DrawLine(Line line)
        {
            using (Graphics graphic = panel_signature.CreateGraphics())
            {
                graphic.DrawLine(pen, line.StartPoint.X, line.StartPoint.Y,
                    line.EndPoint.X, line.EndPoint.Y);
            }
        }

        private void ClearSignaturePanel()
        {
            signature.Clear();
            using (Graphics graphic = panel_signature.CreateGraphics())
            {
                SolidBrush solidBrush = new SolidBrush(Color.LightBlue);
                graphic.FillRectangle(solidBrush, 0, 0, panel_signature.Width, panel_signature.Height);
            }
        }
    }
```

**Authentication logic**
```c#
public partial class Login : Form, BaseEvents
    {
        private BindingList<User> users = new BindingList<User>();

        public Login(string WindowName)
        {
            InitializeComponent();

            Cursor.Current = Cursors.WaitCursor;

            this.Text = WindowName;

            foreach (User staff in Staff.GetStaff())
            {
                users.Add(staff);
            }

            this.list_users.DataSource = users;
            this.list_users.DisplayMember = "Name";
            this.list_users.ValueMember = "ID";

            Cursor.Current = Cursors.Default;

            Program.login = this;
        }

        private void NumbersOnly(object sender, KeyPressEventArgs e)
        {
            if (!char.IsControl(e.KeyChar) && !char.IsDigit(e.KeyChar) && (e.KeyChar != '.'))
            {
                e.Handled = true;
            }

            // only allow one decimal point
            if ((e.KeyChar == '.') && ((sender as TextBox).Text.IndexOf('.') > -1))
            {
                e.Handled = true;
            }
        }

        private void RequestPinReset(object sender, EventArgs args)
        {
            Cursor.Current = Cursors.WaitCursor;

            NameValueCollection postValues = new NameValueCollection();
            postValues.Add("user", ((User)list_users.SelectedItem).Name);

            string response = (string)Rest.SendRequest(Program.URL_REQUEST_PIN_RESET, new String[0], postValues);
            Rest.RequestResult result = new Rest.RequestResult(response);

            if(result.Success) {
                MessageBox.Show(result.Message);
            } else {
                SystemSounds.Exclamation.Play();
                MessageBox.Show(result.Message);
            }
            Cursor.Current = Cursors.Default;
        }

        private void ValidateUserDetails(object sender, EventArgs e)
        {
            if (input_pin.Text == null || input_pin.Text == "")
            {
                MessageBox.Show("ENTER YOUR PIN");
                return;
            }

            int id = ((User)list_users.SelectedItem).ID;
            int pin = Convert.ToInt32(input_pin.Text);

            if (Authentication.ValidateUser(id, pin))
            {
                Cursor.Current = Cursors.WaitCursor;

                MessageBox.Show("WELCOME " + ((User)list_users.SelectedItem).Name);

                Program.loggedInUser = ((User)list_users.SelectedItem);

                new Home("Home").Show();

                this.Hide();

                Cursor.Current = Cursors.Default;
            }
            else
            {
                MessageBox.Show("INVALID DETAILS. TRY AGAIN OR SEE DEV");
                input_pin.Text = "";
            }
        }

        private void ClearPinOnUserChange(object sender, EventArgs e)
        {
            input_pin.Text = "";
        }
    }
```

Drop me a message if you think I might have answers/code to a problem you have if you're still unfortunate enough to be writing code for one of these devices.

# REST Requests
During this period, the other develop and I had started to work on making an integration platform for clients to integrate into our system. In short, we created an API with an OpenAPI spec that was used externally for clients but also internally in the warehouse (With proper data and auth separation of course)

I scanned through half of Google; old forums from the 2000s; Youtube; books etc... There was not find a "nice" way to send HTTP requests to the warehouse API. If we were building for the next version up of .NET, I could have followed [this](https://www.codeproject.com/Articles/255684/Create-and-Consume-RESTFul-Service-in-NET-Framewor) a bit easier.

After a few days of searching, I had eventually come up with a piece of code for our prototype. Please feel free to take this. I hope it helps someone out there.

**My mood whilst writing this solution**

![My mood whilst writing this solution](https://storage.googleapis.com/rexchoppers-website-assets/dot-net-before-solution.jpeg "My mood whilst writing this solution"){: width="250" }

**The code**

```c#
class Rest
    {
        public class RequestResult {

            public RequestResult(string response) {
                string[] splitArray = response.Split(new Char[] { '_' });

                if(splitArray[0] == "ERROR") {
                    this.Success = false;

                } else {
                    this.Success = true;
                }

                this.Message = splitArray[1];
            }

            public bool Success { get; set; }
            public string Message { get; set; }
        }

        public static string SendRequest(string url, string[] files, NameValueCollection postValues)
        {
            WebResponse webResponse2;
            HttpWebRequest httpWebRequest2;

            string response = "";

            try
            {
                long length = 0;
                string boundary = "----------------------------" +
                DateTime.Now.Ticks.ToString("x");

                httpWebRequest2 = (HttpWebRequest)WebRequest.Create(url);
                httpWebRequest2.ContentType = "multipart/form-data; boundary=" + boundary;
                httpWebRequest2.Method = "POST";
                httpWebRequest2.Proxy = null;
                httpWebRequest2.KeepAlive = true;

                httpWebRequest2.Credentials =
                System.Net.CredentialCache.DefaultCredentials;

                Stream memStream = new System.IO.MemoryStream();

                byte[] boundarybytes = System.Text.Encoding.ASCII.GetBytes("\r\n--" + boundary + "\r\n");
                memStream.Write(boundarybytes, 0, boundarybytes.Length);
                length += boundarybytes.Length;

                string headerTemplate = "Content-Disposition: form-data; name=\"{0}\"; filename=\"{1}\"\r\n Content-Type: \"application/octet-stream\"\r\n\r\n";

                for (int i = 0; i < files.Length; i++)
                {
                    string header = string.Format(headerTemplate, i, files[i]);

                    byte[] headerbytes = System.Text.Encoding.UTF8.GetBytes(header);

                    memStream.Write(headerbytes, 0, headerbytes.Length);
                    length += headerbytes.Length;

                    FileStream fileStream = new FileStream(files[i], FileMode.Open,
                    FileAccess.Read);
                    byte[] buffer = new byte[1024];

                    int bytesRead = 0;

                    while ((bytesRead = fileStream.Read(buffer, 0, buffer.Length)) != 0)
                    {
                        memStream.Write(buffer, 0, bytesRead);
                        length += bytesRead;
                    }

                    memStream.Write(boundarybytes, 0, boundarybytes.Length);
                    length += boundarybytes.Length;

                    fileStream.Close();
                }

                string formdataTemplate = "Content-Disposition: form-data; name=\"{0}\"\r\n\r\n{1}";

                foreach (string key in postValues.Keys)
                {
                    memStream.Write(boundarybytes, 0, boundarybytes.Length);
                    string formitem = string.Format(formdataTemplate, key, postValues[key]);
                    byte[] formitembytes = System.Text.Encoding.UTF8.GetBytes(formitem);
                    memStream.Write(formitembytes, 0, formitembytes.Length);
                }
                memStream.Write(boundarybytes, 0, boundarybytes.Length);

                httpWebRequest2.ContentLength = memStream.Length;

                Stream requestStream = httpWebRequest2.GetRequestStream();

                memStream.Position = 0;
                byte[] tempBuffer = new byte[memStream.Length];
                memStream.Read(tempBuffer, 0, tempBuffer.Length);
                memStream.Close();
                requestStream.Write(tempBuffer, 0, tempBuffer.Length);
                requestStream.Close();

                webResponse2 = httpWebRequest2.GetResponse();

                Stream stream2 = webResponse2.GetResponseStream();
                StreamReader reader2 = new StreamReader(stream2);

                response = reader2.ReadToEnd();

                Debug.Write(response);

                webResponse2.Close();
                httpWebRequest2 = null;
                webResponse2 = null;
            }

            catch (Exception e)
            {
                Debug.Write(e.Message);
                if (e is WebException)
                {
                    response = "W4M_NONETWORK";
                }
            }
            return response;
        }

        public static RequestResult GetRequestResult(string response)
        {
            return new RequestResult(response);
        }
    }
```

**Pure ecstasy**

![Pure ecstasy](https://storage.googleapis.com/rexchoppers-website-assets/dot-net-after-solution.jpeg "Pure ecstasy"){: width="250" }

# Final Project + Final Words
After the initial prototype and being able to say to my manager "Yes, this can be done" I quickly got a new project created and in December, we released the first version out to the warehouse. Whilst there were teething issues at the start, this solution made inbound and collections so much quicker. 

I would say this has been one of the best projects I've ever done purely for the fact that what seemed impossible (or at least incredibly difficult) got done. It worked. We shouldn't have been devices that old to start with but we managed to come up with a great solution for a problem with limited resources available. 

For more information on this project or if you just want to talk about it, drop me a message on LinkedIn. I went through hell getting this to work so if I can be of any help, I'll happily offer.

If I find anymore information or remember anything else, I will add it to this article.

# Handy links
[Connecting MC70 to Wi-Fi](https://www.youtube.com/watch?v=t1Hl35FCOvc)